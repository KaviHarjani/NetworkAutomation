from rest_framework import serializers
from .models import (
    Device, Workflow, WorkflowExecution, SystemLog, CommandExecution
)


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    
    class Meta:
        model = Device
        fields = [
            'id', 'name', 'hostname', 'ip_address', 'device_type', 'status',
            'ssh_port', 'vendor', 'model', 'os_version', 'location',
            'description', 'created_by', 'created_by_username', 
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_username', 
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'enable_password': {'write_only': True},
        }


class CommandExecutionSerializer(serializers.ModelSerializer):
    """Serializer for CommandExecution model"""
    
    class Meta:
        model = CommandExecution
        fields = [
            'id', 'command', 'stage', 'status', 'output', 'error_output',
            'validation_result', 'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'started_at', 'completed_at']


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowExecution model"""
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_ip_address = serializers.CharField(
        source='device.ip_address', read_only=True
    )
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    command_executions = CommandExecutionSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowExecution
        fields = [
            'id', 'workflow', 'workflow_name', 'device', 'device_name', 
            'device_ip_address', 'status', 'current_stage', 'started_at', 
            'completed_at', 'error_message', 'pre_check_results', 
            'implementation_results', 'post_check_results', 'rollback_results',
            'created_by', 'created_by_username', 'created_at', 
            'command_executions'
        ]
        read_only_fields = [
            'id', 'workflow_name', 'device_name', 'device_ip_address', 
            'created_by_username', 'created_at', 'command_executions'
        ]


class WorkflowSerializer(serializers.ModelSerializer):
    """Serializer for Workflow model"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    command_counts = serializers.SerializerMethodField()
    required_dynamic_params = serializers.SerializerMethodField()
    has_dynamic_params = serializers.SerializerMethodField()
    
    def get_command_counts(self, obj):
        """Calculate command counts for each stage"""
        def count_commands(commands):
            if not commands:
                return 0
            try:
                if isinstance(commands[0], str):
                    return len([cmd for cmd in commands if cmd.strip()])
                else:
                    return len([
                        cmd for cmd in commands
                        if cmd.get('command', '').strip()
                    ])
            except (IndexError, TypeError):
                return 0
        
        return {
            'pre_check': count_commands(obj.get_pre_check_commands()),
            'implementation': count_commands(
                obj.get_implementation_commands()
            ),
            'post_check': count_commands(obj.get_post_check_commands()),
            'rollback': count_commands(obj.get_rollback_commands())
        }
    
    def get_required_dynamic_params(self, obj):
        """Get list of commands that require dynamic parameters"""
        return obj.get_required_dynamic_params()
    
    def get_has_dynamic_params(self, obj):
        """Check if workflow has any dynamic parameters"""
        params = obj.get_required_dynamic_params()
        return len(params) > 0 if params else False
    
    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'status', 'pre_check_commands',
            'implementation_commands', 'post_check_commands',
            'rollback_commands', 'validation_rules', 'created_by',
            'created_by_username', 'created_at', 'updated_at',
            'command_counts', 'required_dynamic_params', 'has_dynamic_params'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_username', 'created_at',
            'updated_at', 'command_counts', 'required_dynamic_params',
            'has_dynamic_params'
        ]


class WorkflowCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Workflows"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )

    # Custom fields to handle both string and object formats
    pre_check_commands = serializers.JSONField(required=False, default=list)
    implementation_commands = serializers.JSONField(required=False, default=list)
    post_check_commands = serializers.JSONField(required=False, default=list)
    rollback_commands = serializers.JSONField(required=False, default=list)
    validation_rules = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'status', 'pre_check_commands',
            'implementation_commands', 'post_check_commands',
            'rollback_commands', 'validation_rules', 'created_by',
            'created_by_username'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_username']

    def validate_pre_check_commands(self, value):
        """Validate pre_check_commands can be strings or objects"""
        return self._validate_commands(value)

    def validate_implementation_commands(self, value):
        """Validate implementation_commands can be strings or objects"""
        return self._validate_commands(value)

    def validate_post_check_commands(self, value):
        """Validate post_check_commands can be strings or objects"""
        return self._validate_commands(value)

    def validate_rollback_commands(self, value):
        """Validate rollback_commands can be strings or objects"""
        return self._validate_commands(value)

    def _validate_commands(self, commands):
        """Helper method to validate commands in various formats"""
        if not commands:
            return commands

        # Convert to JSON string for storage
        import json
        return json.dumps(commands)


class SystemLogSerializer(serializers.ModelSerializer):
    """Serializer for SystemLog model"""
    username = serializers.CharField(source='user.username', read_only=True)
    diff_html = serializers.SerializerMethodField()
    
    def get_diff_html(self, obj):
        """Get diff HTML if available"""
        return obj.get_diff_html() if hasattr(obj, 'get_diff_html') else None
    
    def get_has_changes(self, obj):
        """Check if there are any changes"""
        return bool(obj.old_values or obj.new_values)
    
    class Meta:
        model = SystemLog
        fields = [
            'id', 'level', 'type', 'message', 'details', 'user', 'username',
            'ip_address', 'user_agent', 'object_type', 'object_id', 
            'old_values', 'new_values', 'created_at', 'diff_html'
        ]
        read_only_fields = [
            'id', 'username', 'created_at', 'diff_html'
        ]


class PaginatedDeviceSerializer(serializers.Serializer):
    """Serializer for paginated device responses"""
    devices = DeviceSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedWorkflowSerializer(serializers.Serializer):
    """Serializer for paginated workflow responses"""
    workflows = WorkflowSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedExecutionSerializer(serializers.Serializer):
    """Serializer for paginated execution responses"""
    executions = WorkflowExecutionSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedLogSerializer(serializers.Serializer):
    """Serializer for paginated log responses"""
    logs = SystemLogSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class WorkflowExecutionCreateSerializer(serializers.Serializer):
    """Serializer for workflow execution request"""
    workflow_id = serializers.UUIDField()
    device_id = serializers.UUIDField()


class WorkflowExecutionResponseSerializer(serializers.Serializer):
    """Serializer for workflow execution response"""
    execution_id = serializers.UUIDField()
    task_id = serializers.CharField()
    message = serializers.CharField()


class ErrorResponseSerializer(serializers.Serializer):
    """Serializer for error responses"""
    error = serializers.CharField()