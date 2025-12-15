from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
import uuid

from .models import WorkflowNode, WorkflowEdge, WorkflowExecutionPath
from .serializers import (
    WorkflowNodeSerializer, WorkflowEdgeSerializer, WorkflowExecutionPathSerializer,
    WorkflowNodeCreateSerializer, WorkflowEdgeCreateSerializer
)


class WorkflowNodeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing WorkflowNode objects"""
    serializer_class = WorkflowNodeSerializer
    
    def get_queryset(self):
        workflow_id = self.request.query_params.get('workflow_id')
        if workflow_id:
            return WorkflowNode.objects.filter(workflow_id=workflow_id)
        return WorkflowNode.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update' or self.action == 'partial_update':
            return WorkflowNodeCreateSerializer
        return WorkflowNodeSerializer
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a workflow node"""
        node = self.get_object()
        
        # Create duplicate
        new_node = WorkflowNode.objects.create(
            workflow=node.workflow,
            node_type=node.node_type,
            name=f"{node.name} (Copy)",
            position_x=node.position_x + 50,
            position_y=node.position_y + 50,
            width=node.width,
            height=node.height,
            command=node.command,
            regex_pattern=node.regex_pattern,
            operator=node.operator,
            expected_output=node.expected_output,
            stage=node.stage,
            is_dynamic=node.is_dynamic,
            store_in_variable=node.store_in_variable,
            variable_description=node.variable_description,
            condition_expression=node.condition_expression,
            condition_variables=node.condition_variables,
        )
        
        serializer = self.get_serializer(new_node)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move a node to a new position"""
        node = self.get_object()
        position_x = request.data.get('position_x')
        position_y = request.data.get('position_y')
        
        if position_x is not None:
            node.position_x = position_x
        if position_y is not None:
            node.position_y = position_y
        
        node.save()
        
        serializer = self.get_serializer(node)
        return Response(serializer.data)


class WorkflowEdgeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing WorkflowEdge objects"""
    serializer_class = WorkflowEdgeSerializer
    
    def get_queryset(self):
        workflow_id = self.request.query_params.get('workflow_id')
        if workflow_id:
            return WorkflowEdge.objects.filter(workflow_id=workflow_id)
        return WorkflowEdge.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update' or self.action == 'partial_update':
            return WorkflowEdgeCreateSerializer
        return WorkflowEdgeSerializer
    
    @action(detail=True, methods=['post'])
    def connect(self, request, pk=None):
        """Create a connection between two nodes"""
        source_node_id = request.data.get('source_node_id')
        target_node_id = request.data.get('target_node_id')
        edge_type = request.data.get('edge_type', 'sequence')
        label = request.data.get('label', '')
        condition_expression = request.data.get('condition_expression', '')
        
        if not source_node_id or not target_node_id:
            return Response(
                {'error': 'source_node_id and target_node_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            source_node = WorkflowNode.objects.get(id=source_node_id)
            target_node = WorkflowNode.objects.get(id=target_node_id)
            
            edge = WorkflowEdge.objects.create(
                workflow=source_node.workflow,
                source_node=source_node,
                target_node=target_node,
                edge_type=edge_type,
                label=label,
                condition_expression=condition_expression,
            )
            
            serializer = self.get_serializer(edge)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except WorkflowNode.DoesNotExist:
            return Response(
                {'error': 'One or both nodes do not exist'},
                status=status.HTTP_404_NOT_FOUND
            )


class BPMNWorkflowViewSet(viewsets.ViewSet):
    """ViewSet for managing complete BPMN workflows"""
    
    @action(detail=True, methods=['get'])
    def get_bpmn_data(self, request, workflow_id=None):
        """Get complete BPMN workflow data"""
        from .models import Workflow
        from .serializers import WorkflowSerializer
        
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        # Get nodes and edges
        nodes = WorkflowNode.objects.filter(workflow=workflow)
        edges = WorkflowEdge.objects.filter(workflow=workflow)
        
        node_serializer = WorkflowNodeSerializer(nodes, many=True)
        edge_serializer = WorkflowEdgeSerializer(edges, many=True)
        workflow_serializer = WorkflowSerializer(workflow)
        
        return Response({
            'workflow': workflow_serializer.data,
            'nodes': node_serializer.data,
            'edges': edge_serializer.data,
        })
    
    @action(detail=True, methods=['post'])
    def save_bpmn_data(self, request, workflow_id=None):
        """Save complete BPMN workflow data"""
        from .models import Workflow
        from django.core.exceptions import ValidationError
        
        workflow = get_object_or_404(Workflow, id=workflow_id)
        nodes_data = request.data.get('nodes', [])
        edges_data = request.data.get('edges', [])
        
        try:
            with transaction.atomic():
                # Delete existing nodes and edges
                WorkflowNode.objects.filter(workflow=workflow).delete()
                WorkflowEdge.objects.filter(workflow=workflow).delete()
                
                # Create new nodes
                node_ids = {}
                for node_data in nodes_data:
                    node_data.pop('id', None)  # Remove any existing ID
                    node_data['workflow'] = workflow.id
                    
                    # Handle condition_variables_list if present
                    condition_variables_list = node_data.pop('condition_variables_list', None)
                    
                    node_serializer = WorkflowNodeCreateSerializer(data=node_data)
                    if node_serializer.is_valid():
                        node = node_serializer.save()
                        node_ids[node_data.get('temp_id', str(uuid.uuid4()))] = node.id
                    else:
                        raise ValidationError(node_serializer.errors)
                
                # Create new edges
                for edge_data in edges_data:
                    edge_data.pop('id', None)  # Remove any existing ID
                    edge_data['workflow'] = workflow.id
                    
                    # Map temporary node IDs to actual IDs
                    if 'source_node' in edge_data and isinstance(edge_data['source_node'], str):
                        edge_data['source_node'] = node_ids.get(edge_data['source_node'], edge_data['source_node'])
                    if 'target_node' in edge_data and isinstance(edge_data['target_node'], str):
                        edge_data['target_node'] = node_ids.get(edge_data['target_node'], edge_data['target_node'])
                    
                    edge_serializer = WorkflowEdgeCreateSerializer(data=edge_data)
                    if edge_serializer.is_valid():
                        edge_serializer.save()
                    else:
                        raise ValidationError(edge_serializer.errors)
                
                return Response({'message': 'BPMN workflow saved successfully'})
                
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def convert_from_linear(self, request, workflow_id=None):
        """Convert linear workflow to BPMN format"""
        from .models import Workflow
        
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        try:
            with transaction.atomic():
                # Get existing linear workflow data
                pre_check_commands = workflow.get_pre_check_commands()
                implementation_commands = workflow.get_implementation_commands()
                post_check_commands = workflow.get_post_check_commands()
                rollback_commands = workflow.get_rollback_commands()
                
                # Create nodes and edges for BPMN format
                nodes = []
                edges = []
                
                # Create start node
                start_node = WorkflowNode.objects.create(
                    workflow=workflow,
                    node_type='start',
                    name='Start',
                    position_x=100,
                    position_y=100,
                    width=80,
                    height=80,
                )
                nodes.append(start_node)
                
                current_y = 250
                
                # Create nodes for each stage
                stages = [
                    ('pre_check', pre_check_commands, 'Pre-Check'),
                    ('implementation', implementation_commands, 'Implementation'),
                    ('post_check', post_check_commands, 'Post-Check'),
                    ('rollback', rollback_commands, 'Rollback'),
                ]
                
                previous_node = start_node
                
                for stage_name, commands, stage_title in stages:
                    if commands:
                        # Create a command node for this stage
                        command_text = '\n'.join([cmd.get('command', '') for cmd in commands if cmd.get('command')])
                        
                        stage_node = WorkflowNode.objects.create(
                            workflow=workflow,
                            node_type='command',
                            name=stage_title,
                            position_x=200,
                            position_y=current_y,
                            width=200,
                            height=100,
                            command=command_text,
                            stage=stage_name,
                        )
                        nodes.append(stage_node)
                        
                        # Connect from previous node
                        edge = WorkflowEdge.objects.create(
                            workflow=workflow,
                            source_node=previous_node,
                            target_node=stage_node,
                            edge_type='sequence',
                        )
                        edges.append(edge)
                        
                        previous_node = stage_node
                        current_y += 200
                
                # Create end node
                end_node = WorkflowNode.objects.create(
                    workflow=workflow,
                    node_type='end',
                    name='End',
                    position_x=100,
                    position_y=current_y,
                    width=80,
                    height=80,
                )
                nodes.append(end_node)
                
                # Connect to end node
                end_edge = WorkflowEdge.objects.create(
                    workflow=workflow,
                    source_node=previous_node,
                    target_node=end_node,
                    edge_type='sequence',
                )
                edges.append(end_edge)
                
                return Response({
                    'message': 'Workflow converted to BPMN format',
                    'nodes_created': len(nodes),
                    'edges_created': len(edges),
                })
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WorkflowExecutionPathViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing workflow execution paths"""
    serializer_class = WorkflowExecutionPathSerializer
    
    def get_queryset(self):
        execution_id = self.request.query_params.get('execution_id')
        if execution_id:
            return WorkflowExecutionPath.objects.filter(workflow_execution_id=execution_id)
        return WorkflowExecutionPath.objects.none()
    
    @action(detail=False, methods=['get'])
    def get_execution_flow(self, request):
        """Get the execution flow for a specific workflow execution"""
        execution_id = request.query_params.get('execution_id')
        
        if not execution_id:
            return Response(
                {'error': 'execution_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import WorkflowExecution
            
            execution = get_object_or_404(WorkflowExecution, id=execution_id)
            paths = WorkflowExecutionPath.objects.filter(
                workflow_execution=execution
            ).order_by('execution_order')
            
            path_serializer = WorkflowExecutionPathSerializer(paths, many=True)
            
            return Response({
                'execution': {
                    'id': execution.id,
                    'workflow_name': execution.workflow.name,
                    'device_name': execution.device.name,
                    'status': execution.status,
                    'started_at': execution.started_at,
                    'completed_at': execution.completed_at,
                },
                'execution_path': path_serializer.data,
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)