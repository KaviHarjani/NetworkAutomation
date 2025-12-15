"""
Unified logging API views for integrating system logs, workflow logs, and Ansible logs
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.paginator import Paginator
from django.contrib.auth.models import User
from .unified_log_utils import UnifiedLogCollector, get_execution_logs
from .models import SystemLog, AnsibleExecution, WorkflowExecution


class UnifiedLogViewSet(viewsets.ViewSet):
    """
    ViewSet for unified logging API that consolidates all log types
    """
    permission_classes = []  # Allow any for now
    
    def list(self, request):
        """
        Get unified logs with filtering and pagination
        
        Query Parameters:
        - search: text search in messages
        - level: log level filter (ERROR, WARNING, INFO, DEBUG, AUDIT)
        - log_type: specific log type (system, ansible, workflow, command, all)
        - device_name: filter by device name
        - execution_type: filter by execution type
        - start_date: filter logs after this date (ISO format)
        - end_date: filter logs before this date (ISO format)
        - page: page number (default: 1)
        - per_page: items per page (default: 20)
        """
        try:
            # Extract filters from request
            filters = {}
            for param in ['search', 'level', 'log_type', 'device_name', 
                         'execution_type', 'start_date', 'end_date']:
                value = request.GET.get(param)
                if value:
                    filters[param] = value
            
            # Get unified logs
            logs = UnifiedLogCollector.get_unified_logs(filters)
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 20))
            paginator = Paginator(logs, per_page)
            page_obj = paginator.get_page(page)
            
            # Convert to dictionaries
            log_data = [log.to_dict() for log in page_obj]
            
            return Response({
                'logs': log_data,
                'total': len(logs),
                'page': page,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'filters_applied': filters
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def execution_logs(self, request):
        """
        Get detailed logs for a specific execution
        
        Query Parameters:
        - execution_id: UUID of the execution
        - execution_type: Type of execution ('ansible', 'workflow')
        """
        try:
            execution_id = request.GET.get('execution_id')
            execution_type = request.GET.get('execution_type')
            
            if not execution_id or not execution_type:
                return Response({
                    'error': 'execution_id and execution_type are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logs_data = get_execution_logs(execution_id, execution_type)
            
            if not logs_data:
                return Response({
                    'error': 'Execution not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response(logs_data)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def log_types(self, request):
        """
        Get available log types and their counts
        """
        try:
            # Get counts for each log type
            system_count = SystemLog.objects.count()
            ansible_count = AnsibleExecution.objects.count()
            workflow_count = WorkflowExecution.objects.count()
            
            return Response({
                'log_types': {
                    'system': {
                        'count': system_count,
                        'name': 'System Logs',
                        'description': 'System events and configuration changes'
                    },
                    'ansible': {
                        'count': ansible_count,
                        'name': 'Ansible Playbooks',
                        'description': 'Ansible playbook executions'
                    },
                    'workflow': {
                        'count': workflow_count,
                        'name': 'Workflow Executions',
                        'description': 'Workflow automation executions'
                    },
                    'command': {
                        'count': 0,  # Will be calculated from CommandExecution if needed
                        'name': 'Command Executions',
                        'description': 'Individual command executions'
                    }
                }
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def devices(self, request):
        """
        Get available devices for filtering
        """
        try:
            from .models import Device
            
            devices = Device.objects.all().values('id', 'name', 'ip_address', 'device_type')
            
            return Response({
                'devices': list(devices)
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def executions(self, request):
        """
        Get recent executions for filtering
        
        Query Parameters:
        - limit: number of executions to return (default: 10)
        """
        try:
            limit = int(request.GET.get('limit', 10))
            
            # Get recent Ansible executions
            ansible_executions = AnsibleExecution.objects.select_related(
                'playbook', 'created_by'
            ).order_by('-created_at')[:limit]
            
            # Get recent Workflow executions
            workflow_executions = WorkflowExecution.objects.select_related(
                'workflow', 'device', 'created_by'
            ).order_by('-created_at')[:limit]
            
            # Combine and sort by timestamp
            all_executions = []
            
            for exec in ansible_executions:
                all_executions.append({
                    'id': str(exec.id),
                    'type': 'ansible',
                    'name': exec.playbook.name,
                    'status': exec.status,
                    'created_at': exec.created_at,
                    'created_by': exec.created_by.username if exec.created_by else 'System',
                    'device_name': None,  # Ansible might target multiple devices
                })
            
            for exec in workflow_executions:
                all_executions.append({
                    'id': str(exec.id),
                    'type': 'workflow',
                    'name': f"{exec.workflow.name} on {exec.device.name}",
                    'status': exec.status,
                    'created_at': exec.created_at,
                    'created_by': exec.created_by.username if exec.created_by else 'System',
                    'device_name': exec.device.name,
                })
            
            # Sort by created_at descending
            all_executions.sort(key=lambda x: x['created_at'], reverse=True)
            
            # Limit results
            all_executions = all_executions[:limit]
            
            return Response({
                'executions': all_executions
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
