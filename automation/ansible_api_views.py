"""
Ansible API viewsets for managing playbooks, inventories, and executions
"""
import os
import re
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.paginator import Paginator
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from .models import AnsiblePlaybook, AnsibleInventory, AnsibleExecution
from .ansible_serializers import (
    AnsiblePlaybookSerializer, AnsiblePlaybookCreateSerializer,
    AnsibleInventorySerializer, AnsibleInventoryCreateSerializer,
    AnsibleExecutionSerializer, AnsibleExecutionCreateSerializer,
    AnsibleExecutionResponseSerializer,
    PaginatedAnsiblePlaybookSerializer, PaginatedAnsibleInventorySerializer,
    PaginatedAnsibleExecutionSerializer
)
from .tasks import execute_ansible_playbook_task
from .ansible_utils import (
    validate_ansible_playbook_content,
    validate_ansible_inventory_content,
    discover_playbooks,
    auto_discover_and_import_playbooks,
    scan_playbook_directory,
    read_playbook_file,
    get_playbooks_directory
)


def create_cors_response(data, status=200):
    """Create JSON response with CORS headers"""
    response = JsonResponse(data, status=status)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = (
        'Content-Type, Authorization, X-Requested-With, X-CSRFToken, Accept, Accept-Encoding'
    )
    return response


class AnsiblePlaybookViewSet(viewsets.ViewSet):
    """
    ViewSet for managing Ansible playbooks
    """
    authentication_classes = []    
    permission_classes = [AllowAny]
    
    def list(self, request):
        """List all Ansible playbooks with pagination"""
        try:
            playbooks = AnsiblePlaybook.objects.all()
            
            # Search filter
            search = request.GET.get('search')
            if search:
                playbooks = playbooks.filter(
                    name__icontains=search
                ) | playbooks.filter(
                    description__icontains=search
                )
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 10))
            paginator = Paginator(playbooks.order_by('-created_at'), per_page)
            page_obj = paginator.get_page(page)
            
            serializer = AnsiblePlaybookSerializer(page_obj, many=True)
            
            return Response({
                'playbooks': serializer.data,
                'total': playbooks.count(),
                'page': page,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        """Create a new Ansible playbook"""
        try:
            # Get user (for now, using a default user or creating anonymous)
            user, created = User.objects.get_or_create(
                username='api_user', 
                defaults={'email': 'api@example.com'}
            )
            
            # Add created_by to the request data
            request_data = request.data.copy()
            request_data['created_by'] = user.id
            
            serializer = AnsiblePlaybookCreateSerializer(data=request_data)
            if serializer.is_valid():
                playbook = serializer.save()
                return Response({
                    'id': str(playbook.id),
                    'message': 'Ansible playbook created successfully'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, pk=None):
        """Get Ansible playbook details"""
        try:
            playbook = AnsiblePlaybook.objects.get(id=pk)
            serializer = AnsiblePlaybookSerializer(playbook)
            return Response(serializer.data)
            
        except AnsiblePlaybook.DoesNotExist:
            return Response({'error': 'Playbook not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, pk=None):
        """Update an Ansible playbook"""
        try:
            playbook = AnsiblePlaybook.objects.get(id=pk)
            serializer = AnsiblePlaybookCreateSerializer(playbook, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'id': str(playbook.id),
                    'message': 'Ansible playbook updated successfully'
                })
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except AnsiblePlaybook.DoesNotExist:
            return Response({'error': 'Playbook not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, pk=None):
        """Delete an Ansible playbook"""
        try:
            playbook = AnsiblePlaybook.objects.get(id=pk)
            playbook.delete()
            
            return Response({
                'id': str(pk),
                'message': 'Ansible playbook deleted successfully'
            })
            
        except AnsiblePlaybook.DoesNotExist:
            return Response({'error': 'Playbook not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def validate(self, request):
        """Validate Ansible playbook syntax"""
        try:
            playbook_content = request.data.get('playbook_content', '')

            if not playbook_content:
                return create_cors_response(
                    {'error': 'playbook_content is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            validation_result = validate_ansible_playbook_content(playbook_content)

            return create_cors_response(validation_result)

        except Exception as e:
            return create_cors_response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], authentication_classes=[], permission_classes=[AllowAny])
    def discover(self, request):
        """Discover playbooks from the filesystem directory"""
        try:
            playbook_dir = request.GET.get('directory')
            discovery = discover_playbooks(playbook_dir)
            return Response({
                'success': True,
                'directory': discovery['directory'],
                'total_files': discovery['total_files'],
                'valid_count': discovery['valid_count'],
                'invalid_count': discovery['invalid_count'],
                'playbooks': discovery['valid_playbooks'],
                'invalid_playbooks': discovery['invalid_playbooks']
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def import_playbooks(self, request):
        """Import discovered playbooks from filesystem to database"""
        try:
            playbook_dir = request.data.get('directory')
            
            # Get or create system user
            user, created = User.objects.get_or_create(
                username='system',
                defaults={'email': 'system@localhost'}
            )
            
            # Import playbooks
            result = auto_discover_and_import_playbooks(playbook_dir, user)
            
            return Response({
                'success': True,
                'message': f'Imported {result["imported"]} playbooks, updated {result["updated"]}',
                'imported': result['imported'],
                'updated': result['updated'],
                'discovered': result['discovered'],
                'errors': result['errors']
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], authentication_classes=[], permission_classes=[AllowAny])
    def directory_info(self, request):
        """Get information about the playbook directory"""
        try:
            playbook_dir = get_playbooks_directory()
            files = scan_playbook_directory(playbook_dir)
            return Response({
                'directory': playbook_dir,
                'playbook_count': len(files),
                'playbooks': [os.path.basename(f) for f in files]
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnsibleInventoryViewSet(viewsets.ViewSet):
    """
    ViewSet for managing Ansible inventories
    """
    permission_classes = [AllowAny]
    
    def list(self, request):
        """List all Ansible inventories with pagination"""
        try:
            inventories = AnsibleInventory.objects.all()
            
            # Search filter
            search = request.GET.get('search')
            if search:
                inventories = inventories.filter(
                    name__icontains=search
                ) | inventories.filter(
                    description__icontains=search
                )
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 10))
            paginator = Paginator(inventories.order_by('-created_at'), per_page)
            page_obj = paginator.get_page(page)
            
            serializer = AnsibleInventorySerializer(page_obj, many=True)
            
            return Response({
                'inventories': serializer.data,
                'total': inventories.count(),
                'page': page,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        """Create a new Ansible inventory"""
        try:
            # Get user (for now, using a default user or creating anonymous)
            user, created = User.objects.get_or_create(
                username='api_user', 
                defaults={'email': 'api@example.com'}
            )
            
            # Add created_by to the request data
            request_data = request.data.copy()
            request_data['created_by'] = user.id
            
            serializer = AnsibleInventoryCreateSerializer(data=request_data)
            if serializer.is_valid():
                inventory = serializer.save()
                return Response({
                    'id': str(inventory.id),
                    'message': 'Ansible inventory created successfully'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, pk=None):
        """Get Ansible inventory details"""
        try:
            inventory = AnsibleInventory.objects.get(id=pk)
            serializer = AnsibleInventorySerializer(inventory)
            return Response(serializer.data)
            
        except AnsibleInventory.DoesNotExist:
            return Response({'error': 'Inventory not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, pk=None):
        """Update an Ansible inventory"""
        try:
            inventory = AnsibleInventory.objects.get(id=pk)
            serializer = AnsibleInventoryCreateSerializer(inventory, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'id': str(inventory.id),
                    'message': 'Ansible inventory updated successfully'
                })
            else:
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
                
        except AnsibleInventory.DoesNotExist:
            return Response({'error': 'Inventory not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, pk=None):
        """Delete an Ansible inventory"""
        try:
            inventory = AnsibleInventory.objects.get(id=pk)
            inventory.delete()
            
            return Response({
                'id': str(pk),
                'message': 'Ansible inventory deleted successfully'
            })
            
        except AnsibleInventory.DoesNotExist:
            return Response({'error': 'Inventory not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def validate(self, request):
        """Validate Ansible inventory syntax"""
        try:
            inventory_content = request.data.get('inventory_content', '')

            if not inventory_content:
                return create_cors_response(
                    {'error': 'inventory_content is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            validation_result = validate_ansible_inventory_content(inventory_content)

            return create_cors_response(validation_result)

        except Exception as e:
            return create_cors_response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AnsibleExecutionViewSet(viewsets.ViewSet):
    """
    ViewSet for managing Ansible executions
    """
    permission_classes = [AllowAny]
    
    def list(self, request):
        """List Ansible playbook executions with filters and pagination"""
        try:
            executions = AnsibleExecution.objects.all()
            
            # Filters
            status_filter = request.GET.get('status')
            if status_filter:
                executions = executions.filter(status=status_filter)
            
            playbook_id = request.GET.get('playbook_id')
            if playbook_id:
                executions = executions.filter(playbook_id=playbook_id)
            
            # Pagination
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 10))
            paginator = Paginator(executions.order_by('-created_at'), per_page)
            page_obj = paginator.get_page(page)
            
            serializer = AnsibleExecutionSerializer(page_obj, many=True)
            
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
    
    def retrieve(self, request, execution_id=None):
        """Get Ansible execution details"""
        try:
            execution = AnsibleExecution.objects.get(id=execution_id)
            serializer = AnsibleExecutionSerializer(execution)
            return Response(serializer.data)
            
        except AnsibleExecution.DoesNotExist:
            return Response({'error': 'Execution not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def execute(self, request):
        """Execute an Ansible playbook"""
        try:
            serializer = AnsibleExecutionCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({'error': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
            
            data = serializer.validated_data
            playbook_id = data['playbook_id']
            inventory_id = data['inventory_id']
            
            playbook = AnsiblePlaybook.objects.get(id=playbook_id)
            inventory = AnsibleInventory.objects.get(id=inventory_id)
            
            user, created = User.objects.get_or_create(
                username='api_user', 
                defaults={'email': 'api@example.com'}
            )
            
            # Create Ansible execution record
            execution = AnsibleExecution.objects.create(
                playbook=playbook,
                inventory=inventory,
                status='pending',
                created_by=user
            )
            
            # Set extra vars, tags, and skip tags
            if data.get('extra_vars_dict'):
                execution.set_extra_vars(data['extra_vars_dict'])
            if data.get('tags_list'):
                execution.set_tags_list(data['tags_list'])
            if data.get('skip_tags_list'):
                execution.set_skip_tags_list(data['skip_tags_list'])
            execution.save()
            
            # Start async task
            task = execute_ansible_playbook_task.delay(str(execution.id))
            
            return Response({
                'execution_id': str(execution.id),
                'task_id': task.id,
                'message': 'Ansible playbook execution started'
            }, status=status.HTTP_202_ACCEPTED)
            
        except AnsiblePlaybook.DoesNotExist:
            return Response({'error': 'Playbook not found'}, status=status.HTTP_404_NOT_FOUND)
        except AnsibleInventory.DoesNotExist:
            return Response({'error': 'Inventory not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)