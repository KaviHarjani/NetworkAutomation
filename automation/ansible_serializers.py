"""
Ansible-specific serializers
"""
from rest_framework import serializers
from .models import AnsiblePlaybook, AnsibleInventory, AnsibleExecution, AnsibleExecutionHost


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
        model = AnsiblePlaybook
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
        model = AnsibleInventory
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
        model = AnsibleExecution
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
        model = AnsibleExecutionHost
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
        model = AnsiblePlaybook
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
        model = AnsibleInventory
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
    playbooks = AnsiblePlaybookSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedAnsibleInventorySerializer(serializers.Serializer):
    """Serializer for paginated Ansible inventory responses"""
    inventories = AnsibleInventorySerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class PaginatedAnsibleExecutionSerializer(serializers.Serializer):
    """Serializer for paginated Ansible execution responses"""
    executions = AnsibleExecutionSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    per_page = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()