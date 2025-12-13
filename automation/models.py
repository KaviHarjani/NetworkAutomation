from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json
import uuid


class Device(models.Model):
    """Model for network devices that can be automated"""
    DEVICE_TYPES = [
        ('router', 'Router'),
        ('switch', 'Switch'),
        ('firewall', 'Firewall'),
        ('load_balancer', 'Load Balancer'),
        ('server', 'Server'),
        ('other', 'Other'),
    ]
    
    DEVICE_STATUS = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('maintenance', 'Maintenance'),
        ('unknown', 'Unknown'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    hostname = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES, default='router')
    status = models.CharField(max_length=20, choices=DEVICE_STATUS, default='unknown')
    ssh_port = models.IntegerField(default=22)
    vendor = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    os_version = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.ip_address})"


class Workflow(models.Model):
    """Model for automation workflows"""
    WORKFLOW_STATUS = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=WORKFLOW_STATUS, default='draft')
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    
    # MariaDB-compatible fields - store JSON as text
    pre_check_commands = models.TextField(default='[]', blank=True)
    implementation_commands = models.TextField(default='[]', blank=True)
    post_check_commands = models.TextField(default='[]', blank=True)
    rollback_commands = models.TextField(default='[]', blank=True)
    required_dynamic_params = models.TextField(default='[]', blank=True, help_text="List of commands that require dynamic parameters")
    
    # Each command will be stored as: {"command": "...", "regex_pattern": "..."}
    validation_rules = models.TextField(default='{}', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def get_pre_check_commands(self):
        """Parse JSON commands from text field"""
        try:
            return json.loads(self.pre_check_commands) if self.pre_check_commands else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_pre_check_commands(self, commands):
        """Store commands as JSON in text field"""
        self.pre_check_commands = json.dumps(commands)
    
    def get_implementation_commands(self):
        """Parse JSON commands from text field"""
        try:
            return json.loads(self.implementation_commands) if self.implementation_commands else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_implementation_commands(self, commands):
        """Store commands as JSON in text field"""
        self.implementation_commands = json.dumps(commands)
    
    def get_post_check_commands(self):
        """Parse JSON commands from text field"""
        try:
            return json.loads(self.post_check_commands) if self.post_check_commands else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_post_check_commands(self, commands):
        """Store commands as JSON in text field"""
        self.post_check_commands = json.dumps(commands)
    
    def get_rollback_commands(self):
        """Parse JSON commands from text field"""
        try:
            return json.loads(self.rollback_commands) if self.rollback_commands else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_rollback_commands(self, commands):
        """Store commands as JSON in text field"""
        self.rollback_commands = json.dumps(commands)
    
    def get_validation_rules(self):
        """Parse JSON validation rules from text field"""
        try:
            return json.loads(self.validation_rules) if self.validation_rules else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_validation_rules(self, rules):
        """Store validation rules as JSON in text field"""
        self.validation_rules = json.dumps(rules)

    def get_required_dynamic_params(self):
        """Get list of commands that require dynamic parameters"""
        try:
            return json.loads(self.required_dynamic_params) if self.required_dynamic_params else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_required_dynamic_params(self, params):
        """Store required dynamic parameters as JSON in text field"""
        self.required_dynamic_params = json.dumps(params)

    def get_example_api_body(self):
        """Generate example API body for executing this workflow with required dynamic parameters"""
        required_params = self.get_required_dynamic_params()
        if not required_params:
            return {
                "workflow_id": str(self.id),
                "device_id": "DEVICE_ID_HERE",
                "dynamic_params": {}
            }
        
        # Generate example values for each required parameter
        example_params = {}
        for param in required_params:
            if "interface" in param.lower():
                example_params[param] = "GigabitEthernet0/1"
            elif "vlan" in param.lower():
                example_params[param] = "100"
            elif "port" in param.lower():
                example_params[param] = "8080"
            elif "ip" in param.lower():
                example_params[param] = "192.168.1.1"
            else:
                example_params[param] = "example_value"
        
        return {
            "workflow_id": str(self.id),
            "device_id": "DEVICE_ID_HERE",
            "dynamic_params": example_params
        }
    
    def __str__(self):
        return self.name


class WorkflowExecution(models.Model):
    """Model for tracking workflow executions"""
    EXECUTION_STATUS = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('rolling_back', 'Rolling Back'),
        ('rolled_back', 'Rolled Back'),
    ]
    
    EXECUTION_STAGE = [
        ('pre_check', 'Pre-Check'),
        ('implementation', 'Implementation'),
        ('post_check', 'Post-Check'),
        ('rollback', 'Rollback'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=EXECUTION_STATUS, default='pending')
    current_stage = models.CharField(max_length=20, choices=EXECUTION_STAGE, default='pre_check')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    dynamic_params = models.TextField(default='{}', blank=True)

    # MariaDB-compatible fields - store JSON as text
    pre_check_results = models.TextField(default='{}', blank=True)
    implementation_results = models.TextField(default='{}', blank=True)
    post_check_results = models.TextField(default='{}', blank=True)
    rollback_results = models.TextField(default='{}', blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def get_pre_check_results(self):
        """Parse JSON results from text field"""
        try:
            return json.loads(self.pre_check_results) if self.pre_check_results else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_pre_check_results(self, results):
        """Store results as JSON in text field"""
        self.pre_check_results = json.dumps(results)
    
    def get_implementation_results(self):
        """Parse JSON results from text field"""
        try:
            return json.loads(self.implementation_results) if self.implementation_results else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_implementation_results(self, results):
        """Store results as JSON in text field"""
        self.implementation_results = json.dumps(results)
    
    def get_post_check_results(self):
        """Parse JSON results from text field"""
        try:
            return json.loads(self.post_check_results) if self.post_check_results else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_post_check_results(self, results):
        """Store results as JSON in text field"""
        self.post_check_results = json.dumps(results)
    
    def get_rollback_results(self):
        """Parse JSON results from text field"""
        try:
            return json.loads(self.rollback_results) if self.rollback_results else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_rollback_results(self, results):
        """Store results as JSON in text field"""
        self.rollback_results = json.dumps(results)

    def get_dynamic_params(self):
        """Parse JSON dynamic params from text field"""
        try:
            return json.loads(self.dynamic_params) if self.dynamic_params else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_dynamic_params(self, params):
        """Store dynamic params as JSON in text field"""
        self.dynamic_params = json.dumps(params)

    def __str__(self):
        return f"{self.workflow.name} - {self.device.name}"


class CommandExecution(models.Model):
    """Model for tracking individual command executions"""
    COMMAND_STAGE = [
        ('pre_check', 'Pre-Check'),
        ('implementation', 'Implementation'),
        ('post_check', 'Post-Check'),
        ('rollback', 'Rollback'),
    ]
    
    COMMAND_STATUS = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='command_executions')
    command = models.TextField()
    stage = models.CharField(max_length=20, choices=COMMAND_STAGE)
    status = models.CharField(max_length=20, choices=COMMAND_STATUS, default='pending')
    output = models.TextField(blank=True)
    error_output = models.TextField(blank=True)
    exit_code = models.IntegerField(null=True, blank=True)
    execution_time = models.FloatField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    validation_result = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['started_at']
    
    def __str__(self):
        return f"{self.stage}: {self.command[:50]}..."


class SystemLog(models.Model):
    """Model for storing system logs and changes"""
    LOG_LEVELS = [
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('DEBUG', 'Debug'),
        ('AUDIT', 'Audit'),
    ]
    
    LOG_TYPES = [
        ('SYSTEM', 'System'),
        ('AUTHENTICATION', 'Authentication'),
        ('DEVICE', 'Device'),
        ('WORKFLOW', 'Workflow'),
        ('CONFIGURATION', 'Configuration'),
        ('TACACS', 'TACACS'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    level = models.CharField(max_length=10, choices=LOG_LEVELS, default='INFO')
    type = models.CharField(max_length=20, choices=LOG_TYPES, default='SYSTEM')
    message = models.TextField()
    details = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # For change tracking
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=50, blank=True)
    old_values = models.TextField(blank=True)
    new_values = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['level']),
            models.Index(fields=['type']),
            models.Index(fields=['object_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"[{self.level}] {self.type}: {self.message[:50]}..."
    
    def get_diff_html(self):
        """Get HTML diff between old and new values"""
        if not self.old_values and not self.new_values:
            return ""
        
        import difflib
        
        old_lines = self.old_values.split('\n') if self.old_values else []
        new_lines = self.new_values.split('\n') if self.new_values else []
        
        diff = difflib.unified_diff(old_lines, new_lines, lineterm='')
        html_lines = []
        
        for line in diff:
            if line.startswith('---') or line.startswith('+++'):
                continue
            elif line.startswith('@@'):
                html_lines.append(f'<div class="diff-header">{line}</div>')
            elif line.startswith('+'):
                html_lines.append(f'<div class="diff-add">{line}</div>')
            elif line.startswith('-'):
                html_lines.append(f'<div class="diff-remove">{line}</div>')
            else:
                html_lines.append(f'<div class="diff-context">{line}</div>')
        
        return '\n'.join(html_lines)

class WebhookConfiguration(models.Model):
    """Model for storing webhook configurations"""
    WEBHOOK_EVENTS = [
        ('execution_completed', 'Execution Completed'),
        ('execution_failed', 'Execution Failed'),
        ('execution_started', 'Execution Started'),
        ('all_events', 'All Events'),
    ]

    WEBHOOK_METHODS = [
        ('POST', 'POST'),
        ('PUT', 'PUT'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    webhook_url = models.URLField(help_text="URL to send webhook notifications")
    events = models.CharField(
        max_length=20,
        choices=WEBHOOK_EVENTS,
        default='execution_completed',
        help_text="Events that trigger this webhook"
    )
    method = models.CharField(
        max_length=10,
        choices=WEBHOOK_METHODS,
        default='POST',
        help_text="HTTP method to use for webhook"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this webhook is active"
    )
    secret_key = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional secret key for webhook verification"
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Webhook Configuration'
        verbose_name_plural = 'Webhook Configurations'

    def __str__(self):
        return f"{self.name} ({self.webhook_url})"

    def get_events_list(self):
        """Get list of events this webhook should trigger on"""
        if self.events == 'all_events':
            return ['execution_completed', 'execution_failed', 'execution_started']
        return [self.events]


class WorkflowVariable(models.Model):
    """Model for storing workflow variables that can be referenced in commands"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='variables')
    name = models.CharField(max_length=100, help_text="Variable name (e.g., 'interface_name', 'vlan_id')")
    value = models.TextField(help_text="Variable value extracted from command output")
    description = models.TextField(blank=True, help_text="Description of what this variable represents")
    source_command = models.TextField(blank=True, help_text="The command that generated this variable")
    source_stage = models.CharField(max_length=20, choices=CommandExecution.COMMAND_STAGE, blank=True)
    extracted_using_regex = models.TextField(blank=True, help_text="The regex pattern used to extract this variable")
    is_active = models.BooleanField(default=True, help_text="Whether this variable is still valid/active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['workflow_execution', 'name']  # Variable names must be unique per execution
        indexes = [
            models.Index(fields=['workflow_execution', 'name']),
            models.Index(fields=['workflow_execution', 'source_stage']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name}: {self.value[:50]}{'...' if len(self.value) > 50 else ''}"
    
    def get_display_value(self):
        """Get a shortened display version of the value"""
        if len(self.value) <= 100:
            return self.value
        return self.value[:97] + "..."