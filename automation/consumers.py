import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import WorkflowExecution


class ExecutionConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time execution updates"""
    
    async def connect(self):
        self.execution_id = self.scope['url_route']['kwargs']['execution_id']
        self.room_group_name = f'execution_{self.execution_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']
        
        if message_type == 'execution_update':
            await self.send_execution_update()
    
    async def send_execution_update(self):
        # Get execution status from database
        execution = await self.get_execution_status()
        
        if execution:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'execution_status',
                    'execution': execution
                }
            )
    
    @database_sync_to_async
    def get_execution_status(self):
        try:
            execution = WorkflowExecution.objects.get(id=self.execution_id)
            return {
                'id': str(execution.id),
                'status': execution.status,
                'current_stage': execution.current_stage,
                'started_at': execution.started_at.isoformat() if execution.started_at else None,
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'error_message': execution.error_message,
            }
        except WorkflowExecution.DoesNotExist:
            return None
    
    async def execution_status(self, event):
        execution = event['execution']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'execution_status',
            'execution': execution
        }))