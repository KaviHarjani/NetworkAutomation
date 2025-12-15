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
    
    # Each command will be stored as: {"command": "...", "regex_pattern": "...", "condition": {...}}
    validation_rules = models.TextField(default='{}', blank=True)
    conditional_logic = models.TextField(default='{}', blank=True, help_text="Conditional execution logic for commands")
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


class WorkflowNode(models.Model):
    """Model for BPMN workflow nodes (steps, conditions, etc.)"""
    NODE_TYPES = [
        ('command', 'Command'),
        ('condition', 'If/Else Condition'),
        ('start', 'Start'),
        ('end', 'End'),
        ('parallel_gateway', 'Parallel Gateway'),
        ('merge_gateway', 'Merge Gateway'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='nodes')
    node_type = models.CharField(max_length=20, choices=NODE_TYPES)
    name = models.CharField(max_length=200, help_text="Human-readable node name")
    position_x = models.FloatField(default=0, help_text="X position in BPMN canvas")
    position_y = models.FloatField(default=0, help_text="Y position in BPMN canvas")
    width = models.FloatField(default=150, help_text="Node width")
    height = models.FloatField(default=80, help_text="Node height")
    
    # For command nodes
    command = models.TextField(blank=True, help_text="Command to execute")
    regex_pattern = models.TextField(blank=True, help_text="Regex pattern for output validation")
    operator = models.CharField(max_length=20, default='contains', help_text="Validation operator")
    expected_output = models.TextField(blank=True, help_text="Expected output for testing")
    stage = models.CharField(max_length=20, blank=True, help_text="Command stage (pre_check, implementation, etc.)")
    is_dynamic = models.BooleanField(default=False, help_text="Whether command uses dynamic parameters")
    store_in_variable = models.CharField(max_length=100, blank=True, help_text="Variable name to store output")
    variable_description = models.TextField(blank=True, help_text="Description of stored variable")
    
    # For condition nodes
    condition_expression = models.TextField(blank=True, help_text="Condition expression (e.g., '{variable_name} == \"value\"')")
    condition_variables = models.TextField(default='[]', blank=True, help_text="JSON array of variables used in condition")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['workflow', 'position_x', 'position_y']
        indexes = [
            models.Index(fields=['workflow', 'node_type']),
            models.Index(fields=['workflow', 'position_x', 'position_y']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.node_type})"
    
    def get_condition_variables(self):
        """Parse JSON condition variables"""
        try:
            return json.loads(self.condition_variables) if self.condition_variables else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_condition_variables(self, variables):
        """Store condition variables as JSON"""
        self.condition_variables = json.dumps(variables)


class WorkflowEdge(models.Model):
    """Model for BPMN workflow edges (connections between nodes)"""
    EDGE_TYPES = [
        ('sequence', 'Sequence Flow'),
        ('condition_true', 'True Condition'),
        ('condition_false', 'False Condition'),
        ('parallel', 'Parallel Flow'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='edges')
    source_node = models.ForeignKey(WorkflowNode, on_delete=models.CASCADE, related_name='outgoing_edges')
    target_node = models.ForeignKey(WorkflowNode, on_delete=models.CASCADE, related_name='incoming_edges')
    edge_type = models.CharField(max_length=20, choices=EDGE_TYPES, default='sequence')
    label = models.CharField(max_length=200, blank=True, help_text="Edge label (e.g., 'Yes', 'No')")
    condition_expression = models.TextField(blank=True, help_text="Edge condition expression")
    position = models.JSONField(default=dict, help_text="Edge routing points for curved lines")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['workflow', 'source_node', 'target_node']
        unique_together = ['workflow', 'source_node', 'target_node']
        indexes = [
            models.Index(fields=['workflow', 'source_node']),
            models.Index(fields=['workflow', 'target_node']),
        ]
    
    def __str__(self):
        return f"{self.source_node.name} → {self.target_node.name} ({self.edge_type})"


class WorkflowExecutionPath(models.Model):
    """Model for tracking which path was taken during workflow execution"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='execution_paths')
    node = models.ForeignKey(WorkflowNode, on_delete=models.CASCADE)
    edge_taken = models.ForeignKey(WorkflowEdge, on_delete=models.CASCADE, null=True, blank=True)
    condition_result = models.BooleanField(null=True, blank=True, help_text="Result of condition evaluation")
    execution_order = models.IntegerField(help_text="Order in which this node was executed")
    executed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['workflow_execution', 'execution_order']
        unique_together = ['workflow_execution', 'execution_order']
        indexes = [
            models.Index(fields=['workflow_execution', 'execution_order']),
            models.Index(fields=['workflow_execution', 'node']),
        ]
    
    def __str__(self):
        return f"{self.workflow_execution} - Step {self.execution_order}: {self.node.name}"


class AnsiblePlaybook(models.Model):
    """Model for storing Ansible playbooks"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    playbook_content = models.TextField(help_text="YAML content of the Ansible playbook")
    tags = models.TextField(default='[]', blank=True, help_text="JSON array of tags")
    variables = models.TextField(default='{}', blank=True, help_text="JSON object of default variables")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def get_tags(self):
        """Parse JSON tags from text field"""
        try:
            return json.loads(self.tags) if self.tags else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_tags(self, tags):
        """Store tags as JSON in text field"""
        self.tags = json.dumps(tags)
    
    def get_variables(self):
        """Parse JSON variables from text field"""
        try:
            return json.loads(self.variables) if self.variables else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_variables(self, variables):
        """Store variables as JSON in text field"""
        self.variables = json.dumps(variables)
    
    def __str__(self):
        return self.name


class AnsibleInventory(models.Model):
    """Model for storing Ansible inventory groups and hosts"""
    INVENTORY_TYPES = [
        ('static', 'Static Inventory'),
        ('dynamic', 'Dynamic Inventory'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    inventory_type = models.CharField(max_length=20, choices=INVENTORY_TYPES, default='static')
    inventory_content = models.TextField(help_text="YAML/INI content of the inventory or script for dynamic")
    group_variables = models.TextField(default='{}', blank=True, help_text="JSON object of group variables")
    host_variables = models.TextField(default='{}', blank=True, help_text="JSON object of host variables")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def get_group_variables(self):
        """Parse JSON group variables from text field"""
        try:
            return json.loads(self.group_variables) if self.group_variables else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_group_variables(self, variables):
        """Store group variables as JSON in text field"""
        self.group_variables = json.dumps(variables)
    
    def get_host_variables(self):
        """Parse JSON host variables from text field"""
        try:
            return json.loads(self.host_variables) if self.host_variables else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_host_variables(self, variables):
        """Store host variables as JSON in text field"""
        self.host_variables = json.dumps(variables)
    
    def __str__(self):
        return f"{self.name} ({self.inventory_type})"


class AnsibleExecution(models.Model):
    """Model for tracking Ansible playbook executions"""
    EXECUTION_STATUS = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playbook = models.ForeignKey(AnsiblePlaybook, on_delete=models.CASCADE)
    inventory = models.ForeignKey(AnsibleInventory, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=EXECUTION_STATUS, default='pending')
    extra_vars = models.TextField(default='{}', blank=True, help_text="JSON object of extra variables")
    tags = models.TextField(default='[]', blank=True, help_text="JSON array of tags to run")
    skip_tags = models.TextField(default='[]', blank=True, help_text="JSON array of tags to skip")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    execution_time = models.FloatField(null=True, blank=True)
    stdout = models.TextField(blank=True)
    stderr = models.TextField(blank=True)
    return_code = models.IntegerField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def get_extra_vars(self):
        """Parse JSON extra vars from text field"""
        try:
            return json.loads(self.extra_vars) if self.extra_vars else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_extra_vars(self, variables):
        """Store extra vars as JSON in text field"""
        self.extra_vars = json.dumps(variables)
    
    def get_tags_list(self):
        """Parse JSON tags from text field"""
        try:
            return json.loads(self.tags) if self.tags else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_tags_list(self, tags):
        """Store tags as JSON in text field"""
        self.tags = json.dumps(tags)
    
    def get_skip_tags_list(self):
        """Parse JSON skip tags from text field"""
        try:
            return json.loads(self.skip_tags) if self.skip_tags else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_skip_tags_list(self, tags):
        """Store skip tags as JSON in text field"""
        self.skip_tags = json.dumps(tags)
    
    def __str__(self):
        return f"{self.playbook.name} - {self.status}"


class AnsibleExecutionHost(models.Model):
    """Model for tracking individual host results in Ansible execution"""
    HOST_STATUS = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('ok', 'OK'),
        ('changed', 'Changed'),
        ('failed', 'Failed'),
        ('unreachable', 'Unreachable'),
        ('skipped', 'Skipped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(AnsibleExecution, on_delete=models.CASCADE, related_name='host_results')
    hostname = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=HOST_STATUS, default='pending')
    task_name = models.CharField(max_length=255, blank=True)
    stdout = models.TextField(blank=True)
    stderr = models.TextField(blank=True)
    return_code = models.IntegerField(null=True, blank=True)
    execution_time = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['execution', 'hostname', 'task_name']
        indexes = [
            models.Index(fields=['execution', 'hostname']),
            models.Index(fields=['execution', 'status']),
        ]
    
    def __str__(self):
        return f"{self.hostname} - {self.status}"