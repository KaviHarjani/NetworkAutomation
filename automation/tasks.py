from celery import shared_task
from django.utils import timezone
from django.contrib.auth.models import User
import logging
import time
from .models import WorkflowExecution, CommandExecution, WebhookConfiguration
from .ssh_utils import execute_command_on_device, validate_output
from .webhook_utils import WebhookManager

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def execute_workflow(self, workflow_execution_id):
    """Execute a workflow with pre-check, implementation, post-check, and rollback"""
    try:
        workflow_execution = WorkflowExecution.objects.get(id=workflow_execution_id)
        workflow = workflow_execution.workflow
        device = workflow_execution.device
        
        logger.info(f"Starting workflow execution: {workflow.name} on {device.name}")
        
        # Update status to running
        workflow_execution.status = 'running'
        workflow_execution.started_at = timezone.now()
        workflow_execution.save()

        # Send webhook notification for execution started
        WebhookManager.send_webhook_notification(workflow_execution, 'execution_started')
        
        # Execute pre-check stage
        self.update_state(state='PROGRESS', meta={'stage': 'Pre-Check', 'progress': 10})
        pre_check_passed = execute_workflow_stage(
            workflow_execution, 'pre_check', workflow.get_pre_check_commands()
        )
        
        if not pre_check_passed:
            # Pre-check failed, don't proceed
            workflow_execution.status = 'failed'
            workflow_execution.current_stage = 'pre_check'
            workflow_execution.error_message = "Pre-check validation failed"
            workflow_execution.completed_at = timezone.now()
            workflow_execution.save()
            logger.error(f"Pre-check failed for workflow {workflow.name}")
    
            # Send webhook notification for failed execution
            WebhookManager.send_webhook_notification(workflow_execution, 'execution_failed')
    
            return {'status': 'failed', 'stage': 'pre_check', 'error': 'Pre-check validation failed'}
        
        # Execute implementation stage
        self.update_state(state='PROGRESS', meta={'stage': 'Implementation', 'progress': 50})
        implementation_success = execute_workflow_stage(
            workflow_execution, 'implementation', workflow.get_implementation_commands()
        )
        
        if not implementation_success:
            # Implementation failed, rollback
            self.update_state(state='PROGRESS', meta={'stage': 'Rollback', 'progress': 80})
            workflow_execution.status = 'rolling_back'
            workflow_execution.current_stage = 'rollback'
            workflow_execution.save()
            
            execute_workflow_stage(
                workflow_execution, 'rollback', workflow.get_rollback_commands()
            )
            
            workflow_execution.status = 'rolled_back'
            workflow_execution.completed_at = timezone.now()
            workflow_execution.save()
            logger.error(f"Implementation failed, rolled back workflow {workflow.name}")

            # Send webhook notification for failed execution
            WebhookManager.send_webhook_notification(workflow_execution, 'execution_failed')

            return {'status': 'rolled_back', 'stage': 'rollback', 'error': 'Implementation failed and rolled back'}
        
        # Execute post-check stage
        self.update_state(state='PROGRESS', meta={'stage': 'Post-Check', 'progress': 90})
        post_check_passed = execute_workflow_stage(
            workflow_execution, 'post_check', workflow.get_post_check_commands()
        )
        
        if not post_check_passed:
            # Post-check failed, rollback
            workflow_execution.status = 'rolling_back'
            workflow_execution.current_stage = 'rollback'
            workflow_execution.save()
            
            execute_workflow_stage(
                workflow_execution, 'rollback', workflow.get_rollback_commands()
            )
            
            workflow_execution.status = 'rolled_back'
            workflow_execution.error_message = "Post-check validation failed"
            workflow_execution.completed_at = timezone.now()
            workflow_execution.save()
            logger.error(f"Post-check failed, rolled back workflow {workflow.name}")

            # Send webhook notification for failed execution
            WebhookManager.send_webhook_notification(workflow_execution, 'execution_failed')

            return {'status': 'rolled_back', 'stage': 'rollback', 'error': 'Post-check validation failed'}
        
        # Workflow completed successfully
        workflow_execution.status = 'completed'
        workflow_execution.current_stage = 'completed'
        workflow_execution.completed_at = timezone.now()
        workflow_execution.save()

        logger.info(f"Workflow completed successfully: {workflow.name}")

        # Send webhook notification for successful completion
        WebhookManager.send_webhook_notification(workflow_execution, 'execution_completed')

        return {'status': 'success', 'stage': 'completed', 'progress': 100}
        
    except WorkflowExecution.DoesNotExist:
        logger.error(f"Workflow execution {workflow_execution_id} not found")
        return {'status': 'error', 'error': 'Workflow execution not found'}
    except Exception as e:
        logger.error(f"Workflow execution error: {e}")
        try:
            workflow_execution = WorkflowExecution.objects.get(id=workflow_execution_id)
            workflow_execution.status = 'failed'
            workflow_execution.error_message = str(e)
            workflow_execution.completed_at = timezone.now()
            workflow_execution.save()
        except:
            pass
        return {'status': 'error', 'error': str(e)}


def execute_workflow_stage(workflow_execution, stage_name, commands):
    """Execute a stage of the workflow (pre-check, implementation, post-check, rollback)"""
    workflow = workflow_execution.workflow
    device = workflow_execution.device
    results = []
    
    for i, command_data in enumerate(commands):
        try:
            # Handle both string commands and dictionary commands
            if isinstance(command_data, dict):
                command = command_data.get('command', '')
                regex_pattern = command_data.get('regex_pattern', '')
            else:
                command = command_data
                regex_pattern = ''
            
            # Create command execution record
            cmd_exec = CommandExecution.objects.create(
                workflow_execution=workflow_execution,
                command=command,
                stage=stage_name,
                status='running',
                started_at=timezone.now()
            )
            
            # Execute command
            success, output = execute_command_on_device(device, command)
            
            cmd_exec.status = 'completed' if success else 'failed'
            cmd_exec.output = output
            cmd_exec.completed_at = timezone.now()
            cmd_exec.save()
            
            results.append({
                'command': command,
                'success': success,
                'output': output,
                'validation_passed': True,
                'regex_pattern': regex_pattern
            })
            
            # Validate output if regex pattern exists
            if regex_pattern:
                validation_rule = {'regex': regex_pattern}
                # Add operator if available, default to 'contains'
                if isinstance(command_data, dict) and 'operator' in command_data:
                    validation_rule['operator'] = command_data['operator']
                # Handle dynamic patterns if this is a dynamic command
                if isinstance(command_data, dict) and command_data.get('is_dynamic', False):
                    # Get dynamic params from workflow execution
                    execution_dynamic_params = workflow_execution.get_dynamic_params()
                    if execution_dynamic_params:
                        # Replace dynamic parameters in the pattern
                        dynamic_regex = regex_pattern
                        for param_name, param_value in execution_dynamic_params.items():
                            placeholder = f"{{{{{param_name}}}}}"
                            if placeholder in dynamic_regex:
                                dynamic_regex = dynamic_regex.replace(placeholder, param_value)
                        validation_rule['regex'] = dynamic_regex
                validation_passed, validation_result = validate_output(output, validation_rule)
                results[-1]['validation_passed'] = validation_passed
                results[-1]['validation_result'] = validation_result
                
                # Update command execution with validation results
                cmd_exec.validation_result = validation_result
                cmd_exec.save()
                
                # If validation failed, handle based on stage
                if not validation_passed:
                    logger.warning(f"Validation failed for {stage_name}: {command}")
                    logger.warning(f"Regex pattern: {regex_pattern}")
                    logger.warning(f"Output: {output}")
                    
                    if stage_name == 'pre_check':
                        # Pre-check validation failed - cancel workflow
                        return False
                    elif stage_name in ['implementation', 'post_check']:
                        # Implementation/Post-check validation failed - will trigger rollback
                        return False
            
        except Exception as e:
            logger.error(f"Error executing command in {stage_name}: {e}")
            # Create failed command execution record
            CommandExecution.objects.create(
                workflow_execution=workflow_execution,
                command=str(command_data),
                stage=stage_name,
                status='failed',
                error_output=str(e),
                completed_at=timezone.now()
            )
            results.append({
                'command': str(command_data),
                'success': False,
                'error': str(e)
            })
            
            # If this is a critical stage and command failed, stop execution
            if stage_name in ['pre_check', 'implementation', 'post_check']:
                return False
    
    # Store results in workflow execution
    stage_results = {f'{stage_name}_results': results}
    if stage_name == 'pre_check':
        workflow_execution.set_pre_check_results(stage_results)
    elif stage_name == 'implementation':
        workflow_execution.set_implementation_results(stage_results)
    elif stage_name == 'post_check':
        workflow_execution.set_post_check_results(stage_results)
    elif stage_name == 'rollback':
        workflow_execution.set_rollback_results(stage_results)
    
    workflow_execution.save()
    
    # Return True if all commands in this stage succeeded and passed validation
    return all(result.get('success', False) and result.get('validation_passed', True) for result in results)


@shared_task
def cleanup_old_executions():
    """Clean up old workflow executions (older than 30 days)"""
    from datetime import timedelta
    cutoff_date = timezone.now() - timedelta(days=30)
    
    old_executions = WorkflowExecution.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['completed', 'failed', 'cancelled', 'rolled_back']
    )
    
    deleted_count = old_executions.count()
    old_executions.delete()
    
    logger.info(f"Cleaned up {deleted_count} old workflow executions")
    return f"Cleaned up {deleted_count} old executions"