from django.contrib import admin
from .models import (
    Device, Workflow, WorkflowExecution, CommandExecution, SystemLog,
    WebhookConfiguration, WorkflowVariable, WorkflowNode, WorkflowEdge,
    WorkflowExecutionPath, AnsiblePlaybook, AnsibleInventory, AnsibleExecution,
    AnsibleExecutionHost, DevicePlaybookMapping
)


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'hostname', 'ip_address', 'device_type', 'status',
        'vendor', 'created_by', 'created_at'
    ]
    list_filter = ['device_type', 'status', 'vendor', 'created_at']
    search_fields = ['name', 'hostname', 'ip_address', 'location']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Device Information', {
            'fields': (
                'id', 'name', 'hostname', 'ip_address',
                'device_type', 'status'
            )
        }),
        ('Connection Details', {
            'fields': ('ssh_port', 'vendor', 'model', 'os_version')
        }),
        ('Device Details', {
            'fields': ('location', 'description')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'is_deleted', 'created_by', 'created_at']
    list_filter = ['status', 'is_deleted', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Workflow Information', {
            'fields': ('id', 'name', 'description', 'status', 'is_deleted')
        }),
        ('Commands', {
            'fields': (
                'pre_check_commands', 'implementation_commands',
                'post_check_commands', 'rollback_commands'
            ),
            'classes': ('collapse',)
        }),
        ('Dynamic Parameters', {
            'fields': ('required_dynamic_params',),
            'classes': ('collapse',)
        }),
        ('Validation & Logic', {
            'fields': ('validation_rules', 'conditional_logic'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'workflow', 'device', 'status', 'current_stage',
        'created_by', 'created_at'
    ]
    list_filter = ['status', 'current_stage', 'created_at']
    search_fields = ['workflow__name', 'device__name']
    readonly_fields = ['id', 'created_at', 'started_at', 'completed_at']
    fieldsets = (
        ('Execution Details', {
            'fields': ('id', 'workflow', 'device', 'status', 'current_stage')
        }),
        ('Dynamic Parameters', {
            'fields': ('dynamic_params',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('started_at', 'completed_at')
        }),
        ('Results', {
            'fields': (
                'pre_check_results', 'implementation_results',
                'post_check_results', 'rollback_results'
            ),
            'classes': ('collapse',)
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CommandExecution)
class CommandExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'workflow_execution', 'command_preview', 'stage', 'status',
        'started_at', 'completed_at'
    ]
    list_filter = ['stage', 'status', 'started_at']
    search_fields = [
        'command', 'workflow_execution__workflow__name',
        'workflow_execution__device__name'
    ]
    readonly_fields = ['id', 'started_at', 'completed_at']
    
    @admin.display(description='Command')
    def command_preview(self, obj):
        if len(obj.command) > 50:
            return obj.command[:50] + '...'
        return obj.command
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'workflow_execution__workflow', 'workflow_execution__device'
        )


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = [
        'level', 'type', 'message_preview', 'user', 'ip_address',
        'created_at'
    ]
    list_filter = ['level', 'type', 'created_at', 'object_type']
    search_fields = ['message', 'details', 'user__username', 'ip_address']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Log Information', {
            'fields': ('id', 'level', 'type', 'message')
        }),
        ('Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
        ('User Information', {
            'fields': ('user', 'ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Change Tracking', {
            'fields': ('object_type', 'object_id', 'old_values', 'new_values'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
        }),
    )
    
    @admin.display(description='Message')
    def message_preview(self, obj):
        if len(obj.message) > 60:
            return obj.message[:60] + '...'
        return obj.message
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(WebhookConfiguration)
class WebhookConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'webhook_url', 'events', 'method', 'is_active',
        'created_by', 'created_at'
    ]
    list_filter = ['events', 'method', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'webhook_url']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Webhook Information', {
            'fields': ('id', 'name', 'description', 'webhook_url')
        }),
        ('Configuration', {
            'fields': ('events', 'method', 'is_active', 'secret_key')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(WorkflowVariable)
class WorkflowVariableAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'value_preview', 'workflow_execution', 'source_stage',
        'is_active', 'created_at'
    ]
    list_filter = ['source_stage', 'is_active', 'created_at']
    search_fields = [
        'name', 'value', 'description', 'source_command',
        'workflow_execution__workflow__name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    @admin.display(description='Value')
    def value_preview(self, obj):
        return obj.get_display_value()
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'workflow_execution__workflow', 'workflow_execution__device'
        )


@admin.register(WorkflowNode)
class WorkflowNodeAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'node_type', 'workflow', 'stage', 'position', 'created_at'
    ]
    list_filter = ['node_type', 'stage', 'workflow', 'is_dynamic']
    search_fields = ['name', 'command', 'condition_expression']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Node Information', {
            'fields': ('id', 'workflow', 'node_type', 'name')
        }),
        ('Position & Size', {
            'fields': ('position_x', 'position_y', 'width', 'height'),
        }),
        ('Command Configuration', {
            'fields': (
                'command', 'regex_pattern', 'operator',
                'expected_output', 'stage', 'is_dynamic'
            ),
            'classes': ('collapse',)
        }),
        ('Variable Storage', {
            'fields': ('store_in_variable', 'variable_description'),
            'classes': ('collapse',)
        }),
        ('Condition Configuration', {
            'fields': ('condition_expression', 'condition_variables'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Position')
    def position(self, obj):
        return f"({obj.position_x}, {obj.position_y})"


@admin.register(WorkflowEdge)
class WorkflowEdgeAdmin(admin.ModelAdmin):
    list_display = [
        'workflow', 'source_node', 'target_node', 'edge_type',
        'label', 'created_at'
    ]
    list_filter = ['edge_type', 'workflow', 'created_at']
    search_fields = [
        'label', 'condition_expression', 'workflow__name',
        'source_node__name', 'target_node__name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'workflow', 'source_node', 'target_node'
        )


@admin.register(WorkflowExecutionPath)
class WorkflowExecutionPathAdmin(admin.ModelAdmin):
    list_display = [
        'workflow_execution', 'execution_order', 'node', 'edge_taken',
        'condition_result', 'executed_at'
    ]
    list_filter = ['execution_order', 'condition_result', 'executed_at']
    search_fields = [
        'workflow_execution__workflow__name',
        'workflow_execution__device__name', 'node__name'
    ]
    readonly_fields = ['id', 'executed_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'workflow_execution__workflow', 'workflow_execution__device',
            'node', 'edge_taken'
        )


@admin.register(AnsiblePlaybook)
class AnsiblePlaybookAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description', 'playbook_content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Playbook Information', {
            'fields': ('id', 'name', 'description')
        }),
        ('Content', {
            'fields': ('playbook_content',),
        }),
        ('Configuration', {
            'fields': ('tags', 'variables'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AnsibleInventory)
class AnsibleInventoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'inventory_type', 'created_by', 'created_at']
    list_filter = ['inventory_type', 'created_at']
    search_fields = ['name', 'description', 'inventory_content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Inventory Information', {
            'fields': ('id', 'name', 'description', 'inventory_type')
        }),
        ('Content', {
            'fields': ('inventory_content',),
        }),
        ('Variables', {
            'fields': ('group_variables', 'host_variables'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AnsibleExecution)
class AnsibleExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'playbook', 'inventory', 'status', 'created_by',
        'started_at', 'execution_time'
    ]
    list_filter = ['status', 'created_at', 'started_at']
    search_fields = ['playbook__name', 'inventory__name', 'stdout', 'stderr']
    readonly_fields = ['id', 'created_at', 'started_at', 'completed_at']
    fieldsets = (
        ('Execution Details', {
            'fields': ('id', 'playbook', 'inventory', 'status')
        }),
        ('Configuration', {
            'fields': ('extra_vars', 'tags', 'skip_tags'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('started_at', 'completed_at', 'execution_time')
        }),
        ('Results', {
            'fields': ('stdout', 'stderr', 'return_code'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AnsibleExecutionHost)
class AnsibleExecutionHostAdmin(admin.ModelAdmin):
    list_display = [
        'execution', 'hostname', 'task_name', 'status', 'execution_time'
    ]
    list_filter = ['status', 'created_at', 'execution__status']
    search_fields = ['hostname', 'task_name', 'execution__playbook__name']
    readonly_fields = ['id', 'created_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'execution__playbook', 'execution__inventory'
        )


@admin.register(DevicePlaybookMapping)
class DevicePlaybookMappingAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'workflow_type', 'mapping_type', 'playbook',
        'priority', 'is_active', 'created_by', 'created_at'
    ]
    list_filter = ['workflow_type', 'is_active', 'priority', 'created_at']
    search_fields = [
        'name', 'description', 'workflow_type', 'playbook__name',
        'vendor', 'model', 'os_version'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    filter_horizontal = ['target_devices']  # Better UI for ManyToManyField
    fieldsets = (
        ('Mapping Information', {
            'fields': ('id', 'name', 'description')
        }),
        ('Specific Target Devices (Preferred)', {
            'fields': ('target_devices',),
            'description': 'Select specific devices this mapping applies to. Leave empty to use metadata filters.'
        }),
        ('Device Metadata Filters (Fallback)', {
            'fields': ('vendor', 'model', 'os_version', 'device_type'),
            'classes': ('collapse',),
            'description': 'Used when no specific devices are selected. All specified fields must match exactly.'
        }),
        ('Workflow Configuration', {
            'fields': ('workflow_type', 'playbook', 'priority', 'is_active')
        }),
        ('Variables & Parameters', {
            'fields': ('default_variables', 'required_params'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Mapping Type')
    def mapping_type(self, obj):
        if obj.target_devices.exists():
            return 'Specific Devices'
        else:
            return 'Metadata Filter'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)