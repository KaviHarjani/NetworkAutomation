from django.contrib import admin
from .models import Device, Workflow, WorkflowExecution, CommandExecution


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'hostname', 'ip_address', 'device_type', 'status', 'vendor', 'created_by', 'created_at']
    list_filter = ['device_type', 'status', 'vendor', 'created_at']
    search_fields = ['name', 'hostname', 'ip_address', 'location']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Device Information', {
            'fields': ('id', 'name', 'hostname', 'ip_address', 'device_type', 'status')
        }),
        ('Connection Details', {
            'fields': ('username', 'password', 'ssh_port', 'enable_password')
        }),
        ('Device Details', {
            'fields': ('vendor', 'model', 'os_version', 'location', 'description')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by for new objects
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Workflow Information', {
            'fields': ('id', 'name', 'description', 'status')
        }),
        ('Commands', {
            'fields': ('pre_check_commands', 'implementation_commands', 'post_check_commands', 'rollback_commands'),
            'classes': ('collapse',)
        }),
        ('Validation', {
            'fields': ('validation_rules',),
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
    list_display = ['workflow', 'device', 'status', 'current_stage', 'created_by', 'created_at']
    list_filter = ['status', 'current_stage', 'created_at']
    search_fields = ['workflow__name', 'device__name']
    readonly_fields = ['id', 'created_at', 'started_at', 'completed_at']
    fieldsets = (
        ('Execution Details', {
            'fields': ('id', 'workflow', 'device', 'status', 'current_stage')
        }),
        ('Timestamps', {
            'fields': ('started_at', 'completed_at')
        }),
        ('Results', {
            'fields': ('pre_check_results', 'implementation_results', 'post_check_results', 'rollback_results'),
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
    list_display = ['workflow_execution', 'command_preview', 'stage', 'status', 'started_at', 'completed_at']
    list_filter = ['stage', 'status', 'started_at']
    search_fields = ['command', 'workflow_execution__workflow__name', 'workflow_execution__device__name']
    readonly_fields = ['id', 'started_at', 'completed_at']
    
    def command_preview(self, obj):
        return obj.command[:50] + '...' if len(obj.command) > 50 else obj.command
    command_preview.short_description = 'Command'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('workflow_execution__workflow', 'workflow_execution__device')