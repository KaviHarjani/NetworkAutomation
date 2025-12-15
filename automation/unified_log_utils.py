"""
Unified logging utilities that consolidate system logs, workflow logs, and Ansible logs
"""
import json
import logging
from django.contrib.auth.models import AnonymousUser
from .models import SystemLog, AnsibleExecution, WorkflowExecution, CommandExecution, Device
from .log_utils import SystemLogger

logger = logging.getLogger(__name__)


class UnifiedLogEntry:
    """Unified log entry that can represent different types of logs"""
    
    def __init__(self, log_type, level, message, timestamp, details=None, 
                 user=None, device_name=None, execution_id=None, execution_type=None,
                 stdout=None, stderr=None, command=None, playbook_name=None,
                 workflow_name=None, host_results=None, **kwargs):
        self.log_type = log_type  # 'system', 'workflow', 'ansible', 'command'
        self.level = level
        self.message = message
        self.timestamp = timestamp
        self.details = details or {}
        self.user = user
        self.device_name = device_name
        self.execution_id = execution_id
        self.execution_type = execution_type  # 'ansible', 'workflow', 'command'
        self.stdout = stdout
        self.stderr = stderr
        self.command = command
        self.playbook_name = playbook_name
        self.workflow_name = workflow_name
        self.host_results = host_results or []
        self.raw_data = kwargs
    
    def to_dict(self):
        """Convert to dictionary for API serialization"""
        return {
            'id': str(self.raw_data.get('id', '')),
            'log_type': self.log_type,
            'level': self.level,
            'message': self.message,
            'timestamp': self.timestamp,
            'details': self.details,
            'user': self.user,
            'device_name': self.device_name,
            'execution_id': self.execution_id,
            'execution_type': self.execution_type,
            'stdout': self.stdout,
            'stderr': self.stderr,
            'command': self.command,
            'playbook_name': self.playbook_name,
            'workflow_name': self.workflow_name,
            'host_results': self.host_results,
        }


class UnifiedLogCollector:
    """Collects and unifies logs from different sources"""
    
    @staticmethod
    def get_unified_logs(filters=None):
        """
        Get unified logs from all sources
        
        Args:
            filters: Dictionary with filtering options
                - search: text search in messages
                - level: log level filter
                - log_type: specific log type filter
                - device_name: device name filter
                - execution_type: execution type filter
                - start_date: filter logs after this date
                - end_date: filter logs before this date
        
        Returns:
            list: UnifiedLogEntry objects
        """
        logs = []
        
        # Collect system logs
        logs.extend(UnifiedLogCollector._get_system_logs(filters))
        
        # Collect Ansible execution logs
        logs.extend(UnifiedLogCollector._get_ansible_logs(filters))
        
        # Collect workflow execution logs
        logs.extend(UnifiedLogCollector._get_workflow_logs(filters))
        
        # Collect command execution logs
        logs.extend(UnifiedLogCollector._get_command_logs(filters))
        
        # Sort by timestamp (newest first)
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        
        return logs
    
    @staticmethod
    def _get_system_logs(filters):
        """Get system logs as unified entries"""
        from django.db.models import Q
        
        queryset = SystemLog.objects.all()
        
        # Apply filters
        if filters:
            if filters.get('search'):
                queryset = queryset.filter(
                    Q(message__icontains=filters['search']) |
                    Q(details__icontains=filters['search'])
                )
            
            if filters.get('level'):
                queryset = queryset.filter(level=filters['level'])
            
            if filters.get('log_type') and filters['log_type'] == 'system':
                queryset = queryset.filter(type=filters.get('type', 'SYSTEM'))
            elif filters.get('log_type') and filters['log_type'] != 'system':
                queryset = queryset.none()  # Exclude system logs
            
            if filters.get('start_date'):
                queryset = queryset.filter(created_at__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(created_at__lte=filters['end_date'])
        
        logs = []
        for log in queryset:
            entry = UnifiedLogEntry(
                log_type='system',
                level=log.level,
                message=log.message,
                timestamp=log.created_at,
                details={'details': log.details} if log.details else {},
                user=log.user.username if log.user else 'System',
                device_name=None,
                execution_id=None,
                execution_type=None,
                id=log.id,
                object_type=log.object_type,
                object_id=log.object_id,
                old_values=log.old_values,
                new_values=log.new_values
            )
            logs.append(entry)
        
        return logs
    
    @staticmethod
    def _get_ansible_logs(filters):
        """Get Ansible execution logs as unified entries"""
        from django.db.models import Q
        
        queryset = AnsibleExecution.objects.select_related('playbook', 'created_by')
        
        # Apply filters
        if filters:
            if filters.get('search'):
                queryset = queryset.filter(
                    Q(playbook__name__icontains=filters['search']) |
                    Q(stdout__icontains=filters['search']) |
                    Q(stderr__icontains=filters['search'])
                )
            
            if filters.get('level') == 'ERROR':
                queryset = queryset.filter(return_code__gt=0)
            elif filters.get('level') == 'INFO':
                queryset = queryset.filter(return_code=0)
            
            if filters.get('log_type') and filters['log_type'] == 'ansible':
                pass  # Include all Ansible logs
            elif filters.get('log_type') and filters['log_type'] != 'ansible':
                queryset = queryset.none()  # Exclude Ansible logs
            
            if filters.get('start_date'):
                queryset = queryset.filter(created_at__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(created_at__lte=filters['end_date'])
        
        logs = []
        for execution in queryset:
            # Create main execution log entry
            level = 'ERROR' if execution.return_code and execution.return_code > 0 else 'INFO'
            status = execution.status
            
            entry = UnifiedLogEntry(
                log_type='ansible',
                level=level,
                message=f"Ansible Playbook: {execution.playbook.name} - Status: {status}",
                timestamp=execution.created_at,
                details={
                    'execution_time': execution.execution_time,
                    'return_code': execution.return_code,
                    'started_at': execution.started_at,
                    'completed_at': execution.completed_at,
                },
                user=execution.created_by.username if execution.created_by else 'System',
                device_name=None,  # Ansible might target multiple devices
                execution_id=str(execution.id),
                execution_type='ansible',
                stdout=execution.stdout,
                stderr=execution.stderr,
                playbook_name=execution.playbook.name,
                id=execution.id
            )
            logs.append(entry)
        
        return logs
    
    @staticmethod
    def _get_workflow_logs(filters):
        """Get workflow execution logs as unified entries"""
        from django.db.models import Q
        
        queryset = WorkflowExecution.objects.select_related(
            'workflow', 'device', 'created_by'
        )
        
        # Apply filters
        if filters:
            if filters.get('search'):
                queryset = queryset.filter(
                    Q(workflow__name__icontains=filters['search']) |
                    Q(device__name__icontains=filters['search']) |
                    Q(error_message__icontains=filters['search'])
                )
            
            if filters.get('level'):
                if filters['level'] == 'ERROR':
                    queryset = queryset.filter(status__in=['failed', 'rolled_back'])
                elif filters['level'] == 'INFO':
                    queryset = queryset.filter(status='completed')
            
            if filters.get('log_type') and filters['log_type'] == 'workflow':
                pass  # Include all workflow logs
            elif filters.get('log_type') and filters['log_type'] != 'workflow':
                queryset = queryset.none()  # Exclude workflow logs
            
            if filters.get('device_name'):
                queryset = queryset.filter(device__name__icontains=filters['device_name'])
            
            if filters.get('start_date'):
                queryset = queryset.filter(created_at__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(created_at__lte=filters['end_date'])
        
        logs = []
        for execution in queryset:
            # Create main execution log entry
            level = 'ERROR' if execution.status in ['failed', 'rolled_back'] else 'INFO'
            
            entry = UnifiedLogEntry(
                log_type='workflow',
                level=level,
                message=f"Workflow: {execution.workflow.name} on {execution.device.name} - Status: {execution.status}",
                timestamp=execution.created_at,
                details={
                    'current_stage': execution.current_stage,
                    'execution_time': (
                        execution.completed_at - execution.started_at
                    ).total_seconds() if execution.started_at and execution.completed_at else None,
                    'error_message': execution.error_message,
                },
                user=execution.created_by.username if execution.created_by else 'System',
                device_name=execution.device.name,
                execution_id=str(execution.id),
                execution_type='workflow',
                workflow_name=execution.workflow.name,
                id=execution.id
            )
            logs.append(entry)
        
        return logs
    
    @staticmethod
    def _get_command_logs(filters):
        """Get command execution logs as unified entries"""
        from django.db.models import Q
        
        queryset = CommandExecution.objects.select_related(
            'workflow_execution__workflow',
            'workflow_execution__device',
            'workflow_execution__created_by'
        )
        
        # Apply filters
        if filters:
            if filters.get('search'):
                queryset = queryset.filter(
                    Q(command__icontains=filters['search']) |
                    Q(output__icontains=filters['search']) |
                    Q(error_output__icontains=filters['search'])
                )
            
            if filters.get('level'):
                if filters['level'] == 'ERROR':
                    queryset = queryset.filter(status='failed')
                elif filters['level'] == 'INFO':
                    queryset = queryset.filter(status='completed')
            
            if filters.get('log_type') and filters['log_type'] == 'command':
                pass  # Include all command logs
            elif filters.get('log_type') and filters['log_type'] != 'command':
                queryset = queryset.none()  # Exclude command logs
            
            if filters.get('device_name'):
                queryset = queryset.filter(
                    workflow_execution__device__name__icontains=filters['device_name']
                )
            
            if filters.get('start_date'):
                queryset = queryset.filter(started_at__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(started_at__lte=filters['end_date'])
        
        logs = []
        for cmd_exec in queryset:
            level = 'ERROR' if cmd_exec.status == 'failed' else 'INFO'
            
            entry = UnifiedLogEntry(
                log_type='command',
                level=level,
                message=f"Command [{cmd_exec.stage}]: {cmd_exec.command[:100]}",
                timestamp=cmd_exec.started_at or cmd_exec.completed_at,
                details={
                    'stage': cmd_exec.stage,
                    'exit_code': cmd_exec.exit_code,
                    'execution_time': cmd_exec.execution_time,
                    'validation_result': cmd_exec.validation_result,
                },
                user=cmd_exec.workflow_execution.created_by.username if cmd_exec.workflow_execution.created_by else 'System',
                device_name=cmd_exec.workflow_execution.device.name,
                execution_id=str(cmd_exec.workflow_execution.id),
                execution_type='command',
                command=cmd_exec.command,
                workflow_name=cmd_exec.workflow_execution.workflow.name,
                id=cmd_exec.id
            )
            logs.append(entry)
        
        return logs


def log_ansible_execution_start(execution, user=None):
    """Log Ansible execution start"""
    SystemLogger.info(
        message=f"Ansible playbook execution started: {execution.playbook.name}",
        log_type='ANSIBLE',
        user=user,
        object_type='ansible_execution',
        object_id=str(execution.id),
        details=f"Playbook: {execution.playbook.name}, Inventory: {execution.inventory.name}"
    )


def log_ansible_execution_complete(execution, user=None):
    """Log Ansible execution completion"""
    level = 'INFO' if execution.return_code == 0 else 'ERROR'
    SystemLogger.log(
        level=level,
        log_type='ANSIBLE',
        message=f"Ansible playbook execution completed: {execution.playbook.name} - Exit code: {execution.return_code}",
        user=user,
        object_type='ansible_execution',
        object_id=str(execution.id),
        details=f"Execution time: {execution.execution_time}s, Status: {execution.status}"
    )


def log_ansible_execution_error(execution, error_message, user=None):
    """Log Ansible execution error"""
    SystemLogger.error(
        message=f"Ansible playbook execution failed: {execution.playbook.name} - {error_message}",
        log_type='ANSIBLE',
        user=user,
        object_type='ansible_execution',
        object_id=str(execution.id),
        details=error_message
    )


def get_execution_logs(execution_id, execution_type):
    """
    Get detailed logs for a specific execution
    
    Args:
        execution_id: UUID of the execution
        execution_type: Type of execution ('ansible', 'workflow')
    
    Returns:
        dict: Detailed execution information with logs
    """
    try:
        if execution_type == 'ansible':
            execution = AnsibleExecution.objects.select_related(
                'playbook', 'inventory', 'created_by'
            ).get(id=execution_id)
            
            return {
                'execution_id': str(execution.id),
                'execution_type': 'ansible',
                'title': f"Ansible: {execution.playbook.name}",
                'playbook_name': execution.playbook.name,
                'inventory_name': execution.inventory.name,
                'status': execution.status,
                'created_at': execution.created_at,
                'started_at': execution.started_at,
                'completed_at': execution.completed_at,
                'execution_time': execution.execution_time,
                'return_code': execution.return_code,
                'created_by': execution.created_by.username if execution.created_by else 'System',
                'extra_vars': execution.get_extra_vars(),
                'tags': execution.get_tags_list(),
                'skip_tags': execution.get_skip_tags_list(),
                'stdout': execution.stdout,
                'stderr': execution.stderr,
                'host_results': []  # Placeholder for future host results implementation
            }
        
        elif execution_type == 'workflow':
            execution = WorkflowExecution.objects.select_related(
                'workflow', 'device', 'created_by'
            ).prefetch_related('command_executions', 'variables').get(id=execution_id)
            
            return {
                'execution_id': str(execution.id),
                'execution_type': 'workflow',
                'title': f"Workflow: {execution.workflow.name} on {execution.device.name}",
                'workflow_name': execution.workflow.name,
                'device_name': execution.device.name,
                'device_ip': execution.device.ip_address,
                'status': execution.status,
                'current_stage': execution.current_stage,
                'created_at': execution.created_at,
                'started_at': execution.started_at,
                'completed_at': execution.completed_at,
                'created_by': execution.created_by.username if execution.created_by else 'System',
                'dynamic_params': execution.get_dynamic_params(),
                'error_message': execution.error_message,
                'pre_check_results': execution.get_pre_check_results(),
                'implementation_results': execution.get_implementation_results(),
                'post_check_results': execution.get_post_check_results(),
                'rollback_results': execution.get_rollback_results(),
                'command_executions': [
                    {
                        'command': cmd.command,
                        'stage': cmd.stage,
                        'status': cmd.status,
                        'output': cmd.output,
                        'error_output': cmd.error_output,
                        'exit_code': cmd.exit_code,
                        'execution_time': cmd.execution_time,
                        'validation_result': cmd.validation_result,
                        'started_at': cmd.started_at,
                        'completed_at': cmd.completed_at,
                    }
                    for cmd in execution.command_executions.all()
                ],
                'variables': [
                    {
                        'name': var.name,
                        'value': var.value,
                        'description': var.description,
                        'source_command': var.source_command,
                        'source_stage': var.source_stage,
                    }
                    for var in execution.variables.all()
                ]
            }
        
        return None
    
    except Exception as e:
        logger.error(f"Error getting execution logs: {e}")
        return None
