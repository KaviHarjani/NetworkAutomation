from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Device, Workflow, WorkflowExecution, SystemLog
from .serializers import (
    DeviceSerializer, WorkflowSerializer, WorkflowCreateSerializer,
    WorkflowExecutionSerializer, WorkflowExecutionCreateSerializer,
    WorkflowExecutionResponseSerializer,
    SystemLogSerializer, PaginatedDeviceSerializer, PaginatedWorkflowSerializer,
    PaginatedExecutionSerializer, PaginatedLogSerializer, ErrorResponseSerializer
)
from .tasks import execute_workflow
from drf_spectacular.utils import extend_schema, OpenApiParameter


class DeviceViewSet(viewsets.ViewSet):
    """
    ViewSet for managing devices
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="List Devices",
        description="Retrieve a paginated list of all devices",
        responses={
            200: PaginatedDeviceSerializer,
            500: ErrorResponseSerializer
        },
        parameters=[
            OpenApiParameter(name='page', type=int, description='Page number'),
            OpenApiParameter(name='per_page', type=int, description='Items per page')
        ]
    )
    def list(self, request):
        """List all devices with pagination"""
        try:
            devices = Device.objects.all()
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 10))
            paginator = Paginator(devices, per_page)
            page_obj = paginator.get_page(page)
            
            serializer = DeviceSerializer(page_obj, many=True)
            
            return Response({
                'devices': serializer.data,
                'total': devices.count(),
                'page': page,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Create Device",
        description="Create a new device",
        request=DeviceSerializer,
        responses={
            201: DeviceSerializer,
            400: ErrorResponseSerializer
        }
    )
    def create(self, request):
        """Create a new device"""
        try:
            # Get user (for now, using a default user or creating anonymous)
            from django.contrib.auth.models import User
            user, created = User.objects.get_or_create(
                username='api_user', 
                defaults={'email': 'api@example.com'}
            )
            
            # Add created_by to the request data
            request_data = request.data.copy()
            request_data['created_by'] = user.id
            
            serializer = DeviceSerializer(data=request_data)
            if serializer.is_valid():
                device = serializer.save()
                return Response({
                    'id': str(device.id),
                    'message': 'Device created successfully'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WorkflowViewSet(viewsets.ViewSet):
    """
    ViewSet for managing workflows
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="List Workflows",
        description="Retrieve a list of all workflows",
        responses={
            200: WorkflowSerializer(many=True),
            500: ErrorResponseSerializer
        }
    )
    def list(self, request):
        """List all workflows (excluding deleted ones)"""
        try:
            workflows = Workflow.objects.filter(is_deleted=False)
            
            serializer = WorkflowSerializer(workflows, many=True)
            return Response({'workflows': serializer.data})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Create Workflow",
        description="Create a new workflow",
        request=WorkflowCreateSerializer,
        responses={
            201: WorkflowCreateSerializer,
            400: ErrorResponseSerializer
        }
    )
    def create(self, request):
        """Create a new workflow"""
        try:
            from django.contrib.auth.models import User
            user, created = User.objects.get_or_create(
                username='api_user', 
                defaults={'email': 'api@example.com'}
            )
            
            # Add created_by to the request data
            request_data = request.data.copy()
            request_data['created_by'] = user.id
            
            serializer = WorkflowCreateSerializer(data=request_data)
            if serializer.is_valid():
                workflow = serializer.save()
                return Response({
                    'id': str(workflow.id),
                    'message': 'Workflow created successfully'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Get Workflow Detail",
        description="Retrieve detailed information about a specific workflow",
        responses={
            200: WorkflowSerializer,
            404: ErrorResponseSerializer,
            500: ErrorResponseSerializer
        }
    )
    def retrieve(self, request, pk=None):
        """Get workflow details (excluding deleted ones)"""
        try:
            workflow = Workflow.objects.get(id=pk, is_deleted=False)
            serializer = WorkflowSerializer(workflow)
            return Response(serializer.data)
            
        except Workflow.DoesNotExist:
            return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Update Workflow",
        description="Update an existing workflow",
        request=WorkflowCreateSerializer,
        responses={
            200: WorkflowCreateSerializer,
            404: ErrorResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def update(self, request, pk=None):
        """Update a workflow"""
        try:
            workflow = Workflow.objects.get(id=pk)
            serializer = WorkflowCreateSerializer(workflow, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'id': str(workflow.id),
                    'message': 'Workflow updated successfully'
                })
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except Workflow.DoesNotExist:
            return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Soft Delete Workflow",
        description="Soft delete a workflow (mark as deleted without removing from database)",
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'id': {'type': 'string'}
                }
            },
            404: ErrorResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    @action(detail=True, methods=['delete'])
    def delete(self, request, pk=None):
        """Soft delete a workflow"""
        try:
            workflow = Workflow.objects.get(id=pk, is_deleted=False)
            workflow.is_deleted = True
            workflow.save()
            
            return Response({
                'id': str(workflow.id),
                'message': 'Workflow deleted successfully'
            })
            
        except Workflow.DoesNotExist:
            return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get Example API Body",
        description="Get example API request body for executing a workflow with dynamic parameters",
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'workflow_id': {'type': 'string'},
                    'workflow_name': {'type': 'string'},
                    'example_api_body': {'type': 'object'},
                    'required_dynamic_params': {'type': 'array', 'items': {'type': 'string'}},
                    'has_dynamic_params': {'type': 'boolean'}
                }
            },
            404: ErrorResponseSerializer,
            500: ErrorResponseSerializer
        }
    )
    @action(detail=True, methods=['get'])
    def example_api_body(self, request, pk=None):
        """Get example API body for executing a workflow with dynamic parameters"""
        try:
            workflow = Workflow.objects.get(id=pk)
            
            # Get required dynamic parameters
            required_params = workflow.get_required_dynamic_params()
            
            # Generate example API body
            example_body = workflow.get_example_api_body()
            
            return Response({
                'workflow_id': str(workflow.id),
                'workflow_name': workflow.name,
                'example_api_body': example_body,
                'required_dynamic_params': required_params,
                'has_dynamic_params': len(required_params) > 0
            })
                
        except Workflow.DoesNotExist:
            return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExecutionViewSet(viewsets.ViewSet):
    """
    ViewSet for managing workflow executions
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="List Executions",
        description="Retrieve a paginated list of workflow executions",
        responses={
            200: PaginatedExecutionSerializer,
            500: ErrorResponseSerializer
        },
        parameters=[
            OpenApiParameter(name='status', type=str, description='Filter by status'),
            OpenApiParameter(name='workflow_id', type=str, description='Filter by workflow ID'),
            OpenApiParameter(name='device_id', type=str, description='Filter by device ID'),
            OpenApiParameter(name='page', type=int, description='Page number'),
            OpenApiParameter(name='per_page', type=int, description='Items per page')
        ]
    )
    def list(self, request):
        """List workflow executions with filters and pagination"""
        try:
            executions = WorkflowExecution.objects.all()
            
            # Filters
            status_filter = request.GET.get('status')
            if status_filter:
                executions = executions.filter(status=status_filter)
            
            workflow_id = request.GET.get('workflow_id')
            if workflow_id:
                executions = executions.filter(workflow_id=workflow_id)
            
            device_id = request.GET.get('device_id')
            if device_id:
                executions = executions.filter(device_id=device_id)
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 10))
            paginator = Paginator(executions.order_by('-created_at'), per_page)
            page_obj = paginator.get_page(page)
            
            serializer = WorkflowExecutionSerializer(page_obj, many=True)
            
            return Response({
                'executions': serializer.data,
                'total': executions.count(),
                'page': page,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Get Execution Detail",
        description="Retrieve detailed information about a specific execution",
        responses={
            200: WorkflowExecutionSerializer,
            404: ErrorResponseSerializer,
            500: ErrorResponseSerializer
        }
    )
    def retrieve(self, request, execution_id=None):
        """Get execution details"""
        try:
            execution = WorkflowExecution.objects.get(id=execution_id)
            serializer = WorkflowExecutionSerializer(execution)
            return Response(serializer.data)
            
        except WorkflowExecution.DoesNotExist:
            return Response({'error': 'Execution not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Execute Workflow",
        description="Start execution of a workflow on a device",
        request=WorkflowExecutionCreateSerializer,
        responses={
            202: WorkflowExecutionResponseSerializer,
            404: ErrorResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    @action(detail=False, methods=['post'])
    def execute(self, request):
        """Execute a workflow on a device"""
        try:
            serializer = WorkflowExecutionCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
            
            data = serializer.validated_data
            workflow_id = data['workflow_id']
            device_id = data['device_id']
            
            workflow = Workflow.objects.get(id=workflow_id)
            device = Device.objects.get(id=device_id)
            
            from django.contrib.auth.models import User
            user, created = User.objects.get_or_create(
                username='api_user', 
                defaults={'email': 'api@example.com'}
            )
            
            # Create workflow execution record
            execution = WorkflowExecution.objects.create(
                workflow=workflow,
                device=device,
                status='pending',
                current_stage='pre_check',
                created_by=user
            )
            
            # Start async task
            task = execute_workflow.delay(str(execution.id))
            
            return Response({
                'execution_id': str(execution.id),
                'task_id': task.id,
                'message': 'Workflow execution started'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Workflow.DoesNotExist:
            return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
        except Device.DoesNotExist:
            return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LogViewSet(viewsets.ViewSet):
    """
    ViewSet for managing system logs
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="List Logs",
        description="Retrieve a paginated list of system logs with filtering",
        responses={
            200: PaginatedLogSerializer,
            500: ErrorResponseSerializer
        },
        parameters=[
            OpenApiParameter(name='level', type=str, description='Filter by log level'),
            OpenApiParameter(name='type', type=str, description='Filter by log type'),
            OpenApiParameter(name='object_type', type=str, description='Filter by object type'),
            OpenApiParameter(name='search', type=str, description='Search in message or details'),
            OpenApiParameter(name='page', type=int, description='Page number'),
            OpenApiParameter(name='per_page', type=int, description='Items per page')
        ]
    )
    def list(self, request):
        """List system logs with filters and pagination"""
        try:
            logs = SystemLog.objects.all()
            
            # Filters
            level = request.GET.get('level')
            if level:
                logs = logs.filter(level=level.upper())
            
            log_type = request.GET.get('type')
            if log_type:
                logs = logs.filter(type=log_type.upper())
            
            object_type = request.GET.get('object_type')
            if object_type:
                logs = logs.filter(object_type=object_type)
            
            # Search in message or details
            search = request.GET.get('search')
            if search:
                logs = logs.filter(
                    Q(message__icontains=search) |
                    Q(details__icontains=search)
                )
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 20))
            paginator = Paginator(logs.order_by('-created_at'), per_page)
            page_obj = paginator.get_page(page)
            
            serializer = SystemLogSerializer(page_obj, many=True)
            
            return Response({
                'logs': serializer.data,
                'total': logs.count(),
                'page': page,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Get Log Detail",
        description="Retrieve detailed information about a specific log entry",
        responses={
            200: SystemLogSerializer,
            404: ErrorResponseSerializer,
            500: ErrorResponseSerializer
        }
    )
    def retrieve(self, request, log_id=None):
        """Get log details"""
        try:
            log = SystemLog.objects.get(id=log_id)
            serializer = SystemLogSerializer(log)
            return Response(serializer.data)
            
        except SystemLog.DoesNotExist:
            return Response({'error': 'Log not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)