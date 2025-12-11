import requests
import json
import logging
from django.conf import settings
from django.utils import timezone
from .models import SystemLog, WorkflowExecution, WebhookConfiguration

logger = logging.getLogger(__name__)

class WebhookManager:
    """
    Webhook management system for sending execution notifications
    """

    @staticmethod
    def send_webhook_notification(workflow_execution, event_type='execution_completed'):
        """
        Send webhook notification for workflow execution events

        Args:
            workflow_execution: WorkflowExecution instance
            event_type: Type of event (execution_completed, execution_failed, etc.)
        """
        try:
            # Get all active webhook configurations that should trigger on this event
            webhook_configs = WebhookConfiguration.objects.filter(is_active=True)

            if not webhook_configs:
                logger.info("No active webhook configurations found, skipping notification")
                return False

            # Filter webhooks that should trigger for this event
            webhooks_to_trigger = []
            for config in webhook_configs:
                events = config.get_events_list()
                if event_type in events:
                    webhooks_to_trigger.append(config)

            if not webhooks_to_trigger:
                logger.info(f"No webhook configurations found for event {event_type}, skipping notification")
                return False

            # Send webhook to all matching configurations
            success_count = 0
            for config in webhooks_to_trigger:
                try:
                    webhook_success = WebhookManager._send_single_webhook(config, workflow_execution, event_type)
                    if webhook_success:
                        success_count += 1
                except Exception as e:
                    logger.error(f"Failed to send webhook for configuration {config.name}: {e}")
                    continue

            return success_count > 0

        except Exception as e:
            logger.error(f"Error in webhook notification process: {e}")
            return False

    @staticmethod
    def _send_single_webhook(config, workflow_execution, event_type):
        """
        Send a single webhook notification to a specific configuration
        """
        try:
            # Prepare payload
            payload = WebhookManager._prepare_payload(workflow_execution, event_type)

            # Send webhook
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'NetworkAutomation/Webhook',
                'X-Event-Type': event_type,
                'X-Timestamp': timezone.now().isoformat()
            }

            # Add secret key if configured
            if config.secret_key:
                headers['X-Webhook-Secret'] = config.secret_key

            response = requests.post(
                config.webhook_url,
                data=json.dumps(payload),
                headers=headers,
                timeout=10  # 10 second timeout
            )

            # Log webhook response
            logger.info(f"Webhook sent to {config.webhook_url}")
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response: {response.text}")

            # Log system event
            SystemLog.objects.create(
                level='INFO',
                type='WEBHOOK',
                message=f"Webhook notification sent for {event_type} to {config.name}",
                details=json.dumps({
                    'webhook_config_id': str(config.id),
                    'workflow_execution_id': str(workflow_execution.id),
                    'status_code': response.status_code,
                    'response': response.text[:500]  # Limit response length
                }),
                object_type='WebhookConfiguration',
                object_id=str(config.id)
            )

            return response.status_code == 200

        except requests.exceptions.RequestException as e:
            logger.error(f"Webhook delivery failed for {config.name}: {e}")

            # Log error
            SystemLog.objects.create(
                level='ERROR',
                type='WEBHOOK',
                message=f"Webhook delivery failed for {config.name}: {str(e)}",
                details=json.dumps({
                    'webhook_config_id': str(config.id),
                    'workflow_execution_id': str(workflow_execution.id),
                    'error': str(e)
                }),
                object_type='WebhookConfiguration',
                object_id=str(config.id)
            )

            return False
        except Exception as e:
            logger.error(f"Webhook error for {config.name}: {e}")
            return False

    @staticmethod
    def _prepare_payload(workflow_execution, event_type):
        """
        Prepare webhook payload with execution details
        """
        workflow = workflow_execution.workflow
        device = workflow_execution.device

        # Get command executions for detailed results
        command_executions = workflow_execution.command_executions.all()

        # Prepare command results
        commands = []
        for cmd_exec in command_executions:
            commands.append({
                'command': cmd_exec.command,
                'stage': cmd_exec.stage,
                'status': cmd_exec.status,
                'output': cmd_exec.output,
                'error_output': cmd_exec.error_output,
                'exit_code': cmd_exec.exit_code,
                'execution_time': cmd_exec.execution_time,
                'started_at': cmd_exec.started_at.isoformat() if cmd_exec.started_at else None,
                'completed_at': cmd_exec.completed_at.isoformat() if cmd_exec.completed_at else None
            })

        # Build payload
        payload = {
            'event_id': str(workflow_execution.id),
            'event_type': event_type,
            'timestamp': timezone.now().isoformat(),
            'workflow': {
                'id': str(workflow.id),
                'name': workflow.name,
                'description': workflow.description,
                'status': workflow.status
            },
            'device': {
                'id': str(device.id),
                'name': device.name,
                'ip_address': device.ip_address,
                'device_type': device.device_type,
                'status': device.status
            },
            'execution': {
                'id': str(workflow_execution.id),
                'status': workflow_execution.status,
                'current_stage': workflow_execution.current_stage,
                'started_at': workflow_execution.started_at.isoformat() if workflow_execution.started_at else None,
                'completed_at': workflow_execution.completed_at.isoformat() if workflow_execution.completed_at else None,
                'error_message': workflow_execution.error_message,
                'duration_seconds': WebhookManager._calculate_duration(workflow_execution)
            },
            'commands': commands,
            'results': {
                'pre_check': workflow_execution.get_pre_check_results(),
                'implementation': workflow_execution.get_implementation_results(),
                'post_check': workflow_execution.get_post_check_results(),
                'rollback': workflow_execution.get_rollback_results()
            }
        }

        return payload

    @staticmethod
    def _calculate_duration(workflow_execution):
        """Calculate execution duration in seconds"""
        if workflow_execution.started_at and workflow_execution.completed_at:
            duration = workflow_execution.completed_at - workflow_execution.started_at
            return duration.total_seconds()
        return None

    @staticmethod
    def send_test_webhook():
        """Send a test webhook for configuration verification"""
        try:
            webhook_url = getattr(settings, 'WORKFLOW_WEBHOOK_URL', None)

            if not webhook_url:
                return False, "No webhook URL configured"

            test_payload = {
                'event_type': 'test_notification',
                'timestamp': timezone.now().isoformat(),
                'message': 'This is a test webhook from Network Automation System',
                'system_info': {
                    'version': '1.0.0',
                    'environment': getattr(settings, 'ENVIRONMENT', 'development')
                }
            }

            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'NetworkAutomation/Webhook/Test',
                'X-Event-Type': 'test_notification'
            }

            response = requests.post(
                webhook_url,
                data=json.dumps(test_payload),
                headers=headers,
                timeout=10
            )

            return response.status_code == 200, f"Test webhook sent: {response.status_code}"

        except Exception as e:
            return False, f"Test webhook failed: {str(e)}"