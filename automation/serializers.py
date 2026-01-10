from rest_framework import serializers
from .models import (
    Device, Workflow, WorkflowExecution, SystemLog, CommandExecution,
    WorkflowNode, WorkflowEdge, WorkflowExecutionPath, WorkflowVariable,
    DevicePlaybookMapping
)


class DeviceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Device model with custom created_by handling"""
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
            'id', 'created_by_username', 
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'enable_password': {'write_only': True},
        }


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
    has_bpmn = serializers.SerializerMethodField()
    
    # Use getter methods instead of raw database fields for commands
    pre_check_commands = serializers.SerializerMethodField()
    implementation_commands = serializers.SerializerMethodField()
    post_check_commands = serializers.SerializerMethodField()
    rollback_commands = serializers.SerializerMethodField()
    validation_rules = serializers.SerializerMethodField()
    
    # BPMN workflow data
    nodes = serializers.SerializerMethodField()
    edges = serializers.SerializerMethodField()
    
    def get_pre_check_commands(self, obj):
        """Get parsed pre-check commands"""
        return obj.get_pre_check_commands()
    
    def get_implementation_commands(self, obj):
        """Get parsed implementation commands"""
        return obj.get_implementation_commands()
    
    def get_post_check_commands(self, obj):
        """Get parsed post-check commands"""
        return obj.get_post_check_commands()
    
    def get_rollback_commands(self, obj):
        """Get parsed rollback commands"""
        return obj.get_rollback_commands()
    
    def get_validation_rules(self, obj):
        """Get parsed validation rules"""
        return obj.get_validation_rules()
    
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
    
    def get_has_bpmn(self, obj):
        """Check if workflow has BPMN nodes/edges"""
        return hasattr(obj, 'nodes') and obj.nodes.exists()
    
    def get_nodes(self, obj):
        """Get BPMN nodes for this workflow"""
        if hasattr(obj, 'nodes'):
            return WorkflowNodeSerializer(obj.nodes.all(), many=True).data
        return []
    
    def get_edges(self, obj):
        """Get BPMN edges for this workflow"""
        if hasattr(obj, 'edges'):
            return WorkflowEdgeSerializer(obj.edges.all(), many=True).data
        return []
    
    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'status', 'pre_check_commands',
            'implementation_commands', 'post_check_commands',
            'rollback_commands', 'validation_rules', 'created_by',
            'created_by_username', 'created_at', 'updated_at',
            'command_counts', 'required_dynamic_params', 'has_dynamic_params',
            'has_bpmn', 'nodes', 'edges'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_username', 'created_at',
            'updated_at', 'command_counts', 'required_dynamic_params',
            'has_dynamic_params', 'has_bpmn', 'nodes', 'edges'
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
    dynamic_params = serializers.DictField(required=False, default=dict)


class WorkflowExecutionResponseSerializer(serializers.Serializer):
    """Serializer for workflow execution response"""
    execution_id = serializers.UUIDField()
    task_id = serializers.CharField()
    message = serializers.CharField()


class ErrorResponseSerializer(serializers.Serializer):
    """Serializer for error responses"""
    error = serializers.CharField()


class WorkflowNodeSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowNode model"""
    condition_variables_list = serializers.SerializerMethodField()
    
    def get_condition_variables_list(self, obj):
        """Get parsed condition variables as list"""
        return obj.get_condition_variables()
    
    class Meta:
        model = WorkflowNode
        fields = [
            'id', 'workflow', 'node_type', 'name', 'position_x', 'position_y',
            'width', 'height', 'command', 'regex_pattern', 'operator',
            'expected_output', 'stage', 'is_dynamic', 'store_in_variable',
            'variable_description', 'condition_expression', 'condition_variables',
            'condition_variables_list', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowEdgeSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowEdge model"""
    source_node_name = serializers.CharField(source='source_node.name', read_only=True)
    target_node_name = serializers.CharField(source='target_node.name', read_only=True)
    
    class Meta:
        model = WorkflowEdge
        fields = [
            'id', 'workflow', 'source_node', 'source_node_name', 'target_node',
            'target_node_name', 'edge_type', 'label', 'condition_expression',
            'position', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'source_node_name', 'target_node_name', 'created_at', 'updated_at']


class WorkflowExecutionPathSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowExecutionPath model"""
    node_name = serializers.CharField(source='node.name', read_only=True)
    edge_label = serializers.CharField(source='edge_taken.label', read_only=True)
    
    class Meta:
        model = WorkflowExecutionPath
        fields = [
            'id', 'workflow_execution', 'node', 'node_name', 'edge_taken',
            'edge_label', 'condition_result', 'execution_order', 'executed_at'
        ]
        read_only_fields = ['id', 'node_name', 'edge_label', 'executed_at']


class WorkflowVariableSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowVariable model"""
    
    class Meta:
        model = WorkflowVariable
        fields = [
            'id', 'workflow_execution', 'name', 'value', 'description',
            'source_command', 'source_stage', 'extracted_using_regex',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BPMNWorkflowSerializer(serializers.Serializer):
    """Serializer for complete BPMN workflow data"""
    workflow = WorkflowSerializer()
    nodes = WorkflowNodeSerializer(many=True)
    edges = WorkflowEdgeSerializer(many=True)
    
    class Meta:
        fields = ['workflow', 'nodes', 'edges']


class WorkflowNodeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating WorkflowNode"""
    condition_variables_list = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True
    )
    
    def create(self, validated_data):
        condition_variables = validated_data.pop('condition_variables_list', [])
        node = super().create(validated_data)
        if condition_variables:
            node.set_condition_variables(condition_variables)
            node.save()
        return node
    
    def update(self, instance, validated_data):
        condition_variables = validated_data.pop('condition_variables_list', None)
        node = super().update(instance, validated_data)
        if condition_variables is not None:
            node.set_condition_variables(condition_variables)
            node.save()
        return node
    
    class Meta:
        model = WorkflowNode
        fields = [
            'id', 'node_type', 'name', 'position_x', 'position_y',
            'width', 'height', 'command', 'regex_pattern', 'operator',
            'expected_output', 'stage', 'is_dynamic', 'store_in_variable',
            'variable_description', 'condition_expression', 'condition_variables_list'
        ]


class WorkflowEdgeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating WorkflowEdge"""
    
    class Meta:
        model = WorkflowEdge
        fields = [
            'id', 'source_node', 'target_node', 'edge_type', 'label',
            'condition_expression', 'position'
        ]


# Ansible serializers
class AnsiblePlaybookSerializer(serializers.ModelSerializer):
    """Serializer for AnsiblePlaybook model"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    tags_list = serializers.SerializerMethodField()
    variables_dict = serializers.SerializerMethodField()
    
    def get_tags_list(self, obj):
        """Get parsed tags as list"""
        return obj.get_tags()
    
    def get_variables_dict(self, obj):
        """Get parsed variables as dict"""
        return obj.get_variables()
    
    class Meta:
        model = None  # Will be set after import
        fields = [
            'id', 'name', 'description', 'playbook_content', 'tags',
            'variables', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'tags_list', 'variables_dict'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'tags_list', 'variables_dict'
        ]


class AnsibleInventorySerializer(serializers.ModelSerializer):
    """Serializer for AnsibleInventory model"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    group_variables_dict = serializers.SerializerMethodField()
    host_variables_dict = serializers.SerializerMethodField()
    
    def get_group_variables_dict(self, obj):
        """Get parsed group variables as dict"""
        return obj.get_group_variables()
    
    def get_host_variables_dict(self, obj):
        """Get parsed host variables as dict"""
        return obj.get_host_variables()
    
    class Meta:
        model = None  # Will be set after import
        fields = [
            'id', 'name', 'description', 'inventory_type', 'inventory_content',
            'group_variables', 'host_variables', 'created_by',
            'created_by_username', 'created_at', 'updated_at',
            'group_variables_dict', 'host_variables_dict'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'group_variables_dict', 'host_variables_dict'
        ]


class AnsibleExecutionSerializer(serializers.ModelSerializer):
    """Serializer for AnsibleExecution model"""
    playbook_name = serializers.CharField(source='playbook.name', read_only=True)
    inventory_name = serializers.CharField(source='inventory.name', read_only=True)
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    extra_vars_dict = serializers.SerializerMethodField()
    tags_list = serializers.SerializerMethodField()
    skip_tags_list = serializers.SerializerMethodField()
    
    def get_extra_vars_dict(self, obj):
        """Get parsed extra vars as dict"""
        return obj.get_extra_vars()
    
    def get_tags_list(self, obj):
        """Get parsed tags as list"""
        return obj.get_tags_list()
    
    def get_skip_tags_list(self, obj):
        """Get parsed skip tags as list"""
        return obj.get_skip_tags_list()
    
    class Meta:
        model = None  # Will be set after import
        fields = [
            'id', 'playbook', 'playbook_name', 'inventory', 'inventory_name',
            'status', 'extra_vars', 'tags', 'skip_tags', 'started_at',
            'completed_at', 'execution_time', 'stdout', 'stderr', 'return_code',
            'created_by', 'created_by_username', 'created_at',
            'extra_vars_dict', 'tags_list', 'skip_tags_list'
        ]
        read_only_fields = [
            'id', 'playbook_name', 'inventory_name', 'created_by_username',
            'created_at', 'extra_vars_dict', 'tags_list', 'skip_tags_list'
        ]


class AnsibleExecutionHostSerializer(serializers.ModelSerializer):
    """Serializer for AnsibleExecutionHost model"""
    
    class Meta:
        model = None  # Will be set after import
        fields = [
            'id', 'execution', 'hostname', 'ip_address', 'status',
            'task_name', 'stdout', 'stderr', 'return_code',
            'execution_time', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AnsiblePlaybookCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AnsiblePlaybook"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    tags_list = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True
    )
    variables_dict = serializers.DictField(
        required=False,
        write_only=True
    )
    
    def create(self, validated_data):
        tags_list = validated_data.pop('tags_list', [])
        variables_dict = validated_data.pop('variables_dict', {})
        
        playbook = super().create(validated_data)
        
        if tags_list:
            playbook.set_tags(tags_list)
        if variables_dict:
            playbook.set_variables(variables_dict)
        
        playbook.save()
        return playbook
    
    class Meta:
        model = None  # Will be set after import
        fields = [
            'id', 'name', 'description', 'playbook_content',
            'tags_list', 'variables_dict', 'created_by', 'created_by_username'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_username']


class AnsibleInventoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AnsibleInventory"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    group_variables_dict = serializers.DictField(
        required=False,
        write_only=True
    )
    host_variables_dict = serializers.DictField(
        required=False,
        write_only=True
    )
    
    def create(self, validated_data):
        group_variables_dict = validated_data.pop('group_variables_dict', {})
        host_variables_dict = validated_data.pop('host_variables_dict', {})
        
        inventory = super().create(validated_data)
        
        if group_variables_dict:
            inventory.set_group_variables(group_variables_dict)
        if host_variables_dict:
            inventory.set_host_variables(host_variables_dict)
        
        inventory.save()
        return inventory
    
    class Meta:
        model = None  # Will be set after import
        fields = [
            'id', 'name', 'description', 'inventory_type', 'inventory_content',
            'group_variables_dict', 'host_variables_dict',
            'created_by', 'created_by_username'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_username']


class AnsibleExecutionCreateSerializer(serializers.Serializer):
    """Serializer for creating AnsibleExecution"""
    playbook_id = serializers.UUIDField()
    inventory_id = serializers.UUIDField()
    extra_vars_dict = serializers.DictField(required=False, default=dict)
    tags_list = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    skip_tags_list = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class AnsibleExecutionResponseSerializer(serializers.Serializer):
    """Serializer for AnsibleExecution response"""
    execution_id = serializers.UUIDField()
    task_id = serializers.CharField()
    message = serializers.CharField()


class PaginatedAnsiblePlaybookSerializer(serializers.Serializer):
    """Serializer for paginated Ansible playbook responses"""
    playbooks = None  # Will be set after AnsiblePlaybookSerializer is created
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedAnsibleInventorySerializer(serializers.Serializer):
    """Serializer for paginated Ansible inventory responses"""
    inventories = None  # Will be set after AnsibleInventorySerializer is created
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedAnsibleExecutionSerializer(serializers.Serializer):
    """Serializer for paginated Ansible execution responses"""
    executions = None  # Will be set after AnsibleExecutionSerializer is created
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


# Device Playbook Mapping serializers
class DevicePlaybookMappingSerializer(serializers.ModelSerializer):
    """Serializer for DevicePlaybookMapping model"""
    playbook_name = serializers.CharField(source='playbook.name', read_only=True)
    target_devices_info = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    default_variables_dict = serializers.SerializerMethodField()
    required_params_list = serializers.SerializerMethodField()
    
    def get_target_devices_info(self, obj):
        """Get information about target devices"""
        devices = obj.target_devices.all()
        return [
            {
                'id': device.id,
                'name': device.name,
                'hostname': device.hostname,
                'vendor': device.vendor,
                'model': device.model,
                'os_version': device.os_version,
                'device_type': device.device_type
            }
            for device in devices
        ]
    
    def get_default_variables_dict(self, obj):
        """Get parsed default variables as dict"""
        return obj.get_default_variables()
    
    def get_required_params_list(self, obj):
        """Get parsed required parameters as list"""
        return obj.get_required_params()
    
    class Meta:
        model = DevicePlaybookMapping
        fields = [
            'id', 'name', 'description', 'target_devices', 'target_devices_info',
            'vendor', 'model', 'os_version', 'device_type',
            'workflow_type', 'playbook', 'playbook_name', 'priority', 'is_active',
            'default_variables', 'required_params', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'default_variables_dict', 'required_params_list'
        ]
        read_only_fields = [
            'id', 'playbook_name', 'created_by_username',
            'created_at', 'updated_at', 'default_variables_dict', 'required_params_list',
            'target_devices_info'
        ]


class DevicePlaybookMappingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating DevicePlaybookMapping"""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    default_variables_dict = serializers.DictField(
        required=False, write_only=True
    )
    required_params_list = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )
    
    def create(self, validated_data):
        default_variables_dict = validated_data.pop('default_variables_dict', {})
        required_params_list = validated_data.pop('required_params_list', [])
        
        mapping = super().create(validated_data)
        
        if default_variables_dict:
            mapping.set_default_variables(default_variables_dict)
        if required_params_list:
            mapping.set_required_params(required_params_list)
        
        mapping.save()
        return mapping
    
    class Meta:
        model = DevicePlaybookMapping
        fields = [
            'id', 'name', 'description', 'target_devices',
            'vendor', 'model', 'os_version', 'device_type',
            'workflow_type', 'playbook', 'priority', 'is_active',
            'default_variables_dict', 'required_params_list', 'created_by', 'created_by_username'
        ]
        read_only_fields = ['id', 'created_by_username']


class GenericAutomationRequestSerializer(serializers.Serializer):
    """Serializer for generic automation request"""
    hostname = serializers.CharField(help_text="Device hostname to execute workflow on")
    workflow = serializers.CharField(help_text="Type of workflow to execute (e.g., 'reboot', 'vlan_add')")
    params = serializers.DictField(required=False, default=dict, help_text="Workflow-specific parameters")


class GenericAutomationResponseSerializer(serializers.Serializer):
    """Serializer for generic automation response"""
    execution_id = serializers.UUIDField()
    task_id = serializers.CharField()
    message = serializers.CharField()
    device_info = serializers.DictField()
    playbook_info = serializers.DictField()
    workflow_type = serializers.CharField()
    mapping_used = serializers.CharField()


class PaginatedDevicePlaybookMappingSerializer(serializers.Serializer):
    """Serializer for paginated DevicePlaybookMapping responses"""
    mappings = DevicePlaybookMappingSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()