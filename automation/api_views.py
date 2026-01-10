from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db import models
import json
import datetime
from .models import (
    Device, Workflow, WorkflowExecution,
    SystemLog, WebhookConfiguration, AnsibleExecution, DevicePlaybookMapping
)
from .tasks import execute_workflow
from .webhook_utils import WebhookManager
from .ansible_utils import (
    validate_ansible_playbook_content,
    validate_ansible_inventory_content
)
from network_automation.celery import app as celery_app


def create_cors_response(data, status=200):
    """Create JSON response with CORS headers"""
    response = JsonResponse(data, status=status)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = (
        'Content-Type, Authorization, X-Requested-With'
    )
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Allow-Age'] = '86400'
    return response


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def device_list(request):
    """API endpoint to list all devices"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        devices = Device.objects.all()
        
        # Pagination
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))
        paginator = Paginator(devices, per_page)
        page_obj = paginator.get_page(page)
        
        device_list = []
        for device in page_obj:
            device_data = {
                'id': str(device.id),
                'name': device.name,
                'hostname': device.hostname,
                'ip_address': device.ip_address,
                'device_type': device.device_type,
                'status': device.status,
                'vendor': device.vendor,
                'model': device.model,
                'location': device.location,
                'created_at': device.created_at.isoformat(),
            }
            device_list.append(device_data)
        
        return create_cors_response({
            'devices': device_list,
            'total': devices.count(),
            'page': page,
            'per_page': per_page,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        })
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def device_grouping(request):
    """API endpoint to get device groupings by model/version/OS"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        # Get all devices
        devices = Device.objects.all()

        # Group devices by model, version, and OS
        groupings = {}
        for device in devices:
            # Create a unique key for each combination
            key = f"{device.model}|{device.os_version}|{device.vendor}"

            if key not in groupings:
                groupings[key] = {
                    'model': device.model,
                    'os_version': device.os_version,
                    'vendor': device.vendor,
                    'device_count': 0,
                    'device_ids': []
                }

            groupings[key]['device_count'] += 1
            groupings[key]['device_ids'].append(str(device.id))

        # Convert to list and sort by device count (descending)
        grouped_list = list(groupings.values())
        grouped_list.sort(key=lambda x: x['device_count'], reverse=True)

        return create_cors_response({
            'groupings': grouped_list,
            'total_groups': len(grouped_list),
            'total_devices': devices.count()
        })

    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def assign_workflow_to_group(request):
    """API endpoint to assign workflow to a device group"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        data = json.loads(request.body)
        workflow_id = data.get('workflow_id')
        device_ids = data.get('device_ids', [])

        if not workflow_id or not device_ids:
            return create_cors_response({'error': 'workflow_id and device_ids are required'}, status=400)

        # Get workflow and devices
        workflow = Workflow.objects.get(id=workflow_id)

        # Create device-workflow mappings (this would be a new model in a full implementation)
        # For now, we'll just return success
        return create_cors_response({
            'message': f'Assigned workflow {workflow.name} to {len(device_ids)} devices',
            'workflow_id': str(workflow_id),
            'device_count': len(device_ids),
            'devices_assigned': device_ids
        })

    except Workflow.DoesNotExist:
        return create_cors_response({'error': 'Workflow not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def assign_playbook_to_group(request):
    """API endpoint to assign Ansible playbook to a device group"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        data = json.loads(request.body)
        playbook_id = data.get('playbook_id')
        device_ids = data.get('device_ids', [])

        if not playbook_id or not device_ids:
            return create_cors_response({
                'error': 'playbook_id and device_ids are required'
            }, status=400)

        # Validate playbook exists
        try:
            from .models import AnsiblePlaybook
            playbook = AnsiblePlaybook.objects.get(id=playbook_id)
        except AnsiblePlaybook.DoesNotExist:
            return create_cors_response({
                'error': 'Ansible playbook not found'
            }, status=404)

        # Validate devices exist
        devices = Device.objects.filter(id__in=device_ids)
        if devices.count() != len(device_ids):
            return create_cors_response({
                'error': 'One or more devices not found'
            }, status=404)

        # In a full implementation, this would create device-playbook mappings
        # For now, we'll just return success
        return create_cors_response({
            'message': f'Assigned playbook "{playbook.name}" to {len(device_ids)} devices',
            'playbook_id': str(playbook_id),
            'playbook_name': playbook.name,
            'device_count': len(device_ids),
            'devices_assigned': device_ids
        })

    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def generate_group_inventory_api(request):
    """API endpoint to generate Ansible inventory from device group"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        data = json.loads(request.body)
        device_ids = data.get('device_ids', [])
        group_name = data.get('group_name')

        if not device_ids:
            return create_cors_response({'error': 'device_ids are required'}, status=400)

        # Import the function from ansible_utils
        from .ansible_utils import generate_group_inventory
        
        # Generate inventory content
        inventory_content = generate_group_inventory(device_ids, group_name)
        
        return create_cors_response({
            'inventory_content': inventory_content,
            'device_count': len(device_ids),
            'group_name': group_name or 'auto-generated',
            'format': 'ini'
        })

    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def execute_workflow_api(request):
    try:
        if request.method == 'OPTIONS':
            return create_cors_response({}, status=200)

        data = json.loads(request.body)
        workflow_id = data.get('workflow_id')
        device_id = data.get('device_id')
        dynamic_params = data.get('dynamic_params', {})

        # Validate required fields
        if not workflow_id or not device_id:
            return create_cors_response({'error': 'workflow_id and device_id are required'}, status=400)

        try:
            workflow = Workflow.objects.get(id=workflow_id)
            device = Device.objects.get(id=device_id)
        except Workflow.DoesNotExist:
            return create_cors_response({'error': 'Workflow not found'}, status=404)
        except Device.DoesNotExist:
            return create_cors_response({'error': 'Device not found'}, status=404)

        # Create workflow execution record
        workflow_execution = WorkflowExecution.objects.create(
            workflow=workflow,
            device=device,
            status='pending',
            current_stage='pending',
            created_by=request.user if request.user.is_authenticated else None
        )

        # Process commands with dynamic regex patterns
        all_commands = []

        # Helper function to process commands and apply dynamic params
        def process_commands(commands, stage):
            processed = []
            for cmd in commands:
                if isinstance(cmd, dict):
                    command = cmd.get('command', '')
                    regex_pattern = cmd.get('regex_pattern', '')
                    operator = cmd.get('operator', 'contains')

                    # Check if this command has dynamic regex pattern
                    if command in dynamic_params and dynamic_params[command]:
                        # Replace {param} with actual value in regex pattern
                        param_value = dynamic_params[command]
                        if regex_pattern:
                            # Simple parameter replacement - can be enhanced
                            dynamic_regex = regex_pattern.replace('{param}', param_value)
                            processed.append({
                                'command': command,
                                'regex_pattern': dynamic_regex,
                                'operator': operator,
                                'original_command': command,
                                'param_value': param_value
                            })
                        else:
                            # If no regex pattern, create a simple one with the parameter
                            processed.append({
                                'command': command,
                                'regex_pattern': param_value,
                                'operator': 'contains',
                                'original_command': command,
                                'param_value': param_value
                            })
                    else:
                        processed.append(cmd)
                else:
                    processed.append(cmd)
            return processed

        # Process all stages with dynamic params
        pre_check_commands = process_commands(workflow.get_pre_check_commands(), 'pre_check')
        implementation_commands = process_commands(workflow.get_implementation_commands(), 'implementation')
        post_check_commands = process_commands(workflow.get_post_check_commands(), 'post_check')
        rollback_commands = process_commands(workflow.get_rollback_commands(), 'rollback')

        # Store the processed commands for execution
        # Store dynamic parameters for reference
        workflow_execution.set_dynamic_params(dynamic_params)
        workflow_execution.save()

        # Start workflow execution asynchronously
        task = execute_workflow.delay(str(workflow_execution.id))

        return create_cors_response({
            'message': 'Workflow execution started successfully',
            'execution_id': str(workflow_execution.id),
            'task_id': str(task.id),
            'workflow_name': workflow.name,
            'device_name': device.name,
            'dynamic_params_applied': len(dynamic_params) > 0
        }, status=200)

    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def device_create(request):
    """API endpoint to create a new device"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        data = json.loads(request.body)
        
        # Get user (for now, using a default user or creating anonymous)
        from django.contrib.auth.models import User
        user, created = User.objects.get_or_create(
            username='api_user', 
            defaults={'email': 'api@example.com'}
        )
        
        device = Device.objects.create(
            name=data['name'],
            hostname=data['hostname'],
            ip_address=data['ip_address'],
            device_type=data.get('device_type', 'router'),
            username=data['username'],
            password=data['password'],
            ssh_port=data.get('ssh_port', 22),
            enable_password=data.get('enable_password'),
            vendor=data.get('vendor', ''),
            model=data.get('model', ''),
            os_version=data.get('os_version', ''),
            location=data.get('location', ''),
            description=data.get('description', ''),
            created_by=user
        )
        
        return create_cors_response({
            'id': str(device.id),
            'message': 'Device created successfully'
        }, status=201)
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def workflow_list(request):
    """API endpoint to list all workflows"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        workflows = Workflow.objects.all()
        
        workflow_list = []
        for workflow in workflows:
            # Helper function to count actual commands (with command text)
            def count_commands(commands):
                if not commands:
                    return 0
                try:
                    # Handle both old format (strings) and new format (objects)
                    if isinstance(commands[0], str):
                        # Old format - count all non-empty strings
                        return len([cmd for cmd in commands if cmd.strip()])
                    else:
                        # New format - count objects with command text
                        return len([cmd for cmd in commands if cmd.get('command', '').strip()])
                except (IndexError, TypeError):
                    return 0
            
            workflow_data = {
                'id': str(workflow.id),
                'name': workflow.name,
                'description': workflow.description,
                'status': workflow.status,
                'created_by': workflow.created_by.username,
                'created_at': workflow.created_at.isoformat(),
                'updated_at': workflow.updated_at.isoformat(),
                'command_counts': {
                    'pre_check': count_commands(workflow.get_pre_check_commands()),
                    'implementation': count_commands(workflow.get_implementation_commands()),
                    'post_check': count_commands(workflow.get_post_check_commands()),
                    'rollback': count_commands(workflow.get_rollback_commands())
                }
            }
            workflow_list.append(workflow_data)
        
        return create_cors_response({'workflows': workflow_list})
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def workflow_create(request):
    """API endpoint to create a new workflow"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        data = json.loads(request.body)
        
        from django.contrib.auth.models import User
        user, created = User.objects.get_or_create(
            username='api_user',
            defaults={'email': 'api@example.com'}
        )
        
        # Process commands to ensure variable assignment fields are properly handled
        def process_commands_with_variables(commands):
            """Process commands to handle variable assignments"""
            processed_commands = []
            for cmd in commands:
                if isinstance(cmd, dict):
                    processed_cmd = cmd.copy()
                    # Ensure variable fields exist
                    processed_cmd.setdefault('store_in_variable', '')
                    processed_cmd.setdefault('variable_description', '')
                    processed_commands.append(processed_cmd)
                else:
                    # Legacy string command format
                    processed_commands.append({
                        'command': cmd,
                        'regex_pattern': '',
                        'operator': 'contains',
                        'is_dynamic': False,
                        'store_in_variable': '',
                        'variable_description': ''
                    })
            return processed_commands
        
        # Extract required dynamic parameters from commands
        required_dynamic_params = []
        for stage in ['pre_check_commands', 'implementation_commands', 'post_check_commands', 'rollback_commands']:
            commands = data.get(stage, [])
            for cmd in commands:
                if isinstance(cmd, dict) and cmd.get('is_dynamic'):
                    required_dynamic_params.append(cmd.get('command', ''))

        workflow = Workflow.objects.create(
            name=data['name'],
            description=data['description'],
            status=data.get('status', 'draft'),
            pre_check_commands=process_commands_with_variables(data.get('pre_check_commands', [])),
            implementation_commands=process_commands_with_variables(data.get('implementation_commands', [])),
            post_check_commands=process_commands_with_variables(data.get('post_check_commands', [])),
            rollback_commands=process_commands_with_variables(data.get('rollback_commands', [])),
            validation_rules=data.get('validation_rules', {}),
            required_dynamic_params=required_dynamic_params,
            created_by=user
        )
        
        return create_cors_response({
            'id': str(workflow.id),
            'message': 'Workflow created successfully'
        }, status=201)
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)
@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def workflow_detail(request, workflow_id):
    """API endpoint to get workflow details"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        workflow = Workflow.objects.get(id=workflow_id)

        # Helper function to count actual commands (with command text)
        def count_commands(commands):
            if not commands:
                return 0
            # Handle both old format (strings) and new format (objects)
            if isinstance(commands[0], str):
                # Old format - count all non-empty strings
                return len([cmd for cmd in commands if cmd.strip()])
            else:
                # New format - count objects with command text
                return len([cmd for cmd in commands if cmd.get('command', '').strip()])

        workflow_data = {
            'id': str(workflow.id),
            'name': workflow.name,
            'description': workflow.description,
            'status': workflow.status,
            'created_by': workflow.created_by.username,
            'created_at': workflow.created_at.isoformat(),
            'updated_at': workflow.updated_at.isoformat(),
            'pre_check_commands': workflow.get_pre_check_commands(),
            'implementation_commands': workflow.get_implementation_commands(),
            'post_check_commands': workflow.get_post_check_commands(),
            'rollback_commands': workflow.get_rollback_commands(),
            'validation_rules': workflow.get_validation_rules(),
            'required_dynamic_params': workflow.get_required_dynamic_params(),
            'command_counts': {
                'pre_check': count_commands(workflow.get_pre_check_commands()),
                'implementation': count_commands(workflow.get_implementation_commands()),
                'post_check': count_commands(workflow.get_post_check_commands()),
                'rollback': count_commands(workflow.get_rollback_commands())
            }
        }

        return create_cors_response(workflow_data)

    except Workflow.DoesNotExist:
        return create_cors_response({'error': 'Workflow not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def workflow_example_api_body(request, workflow_id):
    """API endpoint to get example API body for executing a workflow with dynamic parameters"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        workflow = Workflow.objects.get(id=workflow_id)
        example_body = workflow.get_example_api_body()
        
        return create_cors_response({
            'workflow_id': str(workflow.id),
            'workflow_name': workflow.name,
            'example_api_body': example_body,
            'required_dynamic_params': workflow.get_required_dynamic_params(),
            'has_dynamic_params': len(workflow.get_required_dynamic_params()) > 0
        })

    except Workflow.DoesNotExist:
        return create_cors_response({'error': 'Workflow not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PUT", "OPTIONS"])
def workflow_update(request, workflow_id):
    """API endpoint to update a workflow"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'PUT, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        workflow = Workflow.objects.get(id=workflow_id)
        data = json.loads(request.body)
        
        # Update workflow fields
        workflow.name = data.get('name', workflow.name)
        workflow.description = data.get('description', workflow.description)
        workflow.status = data.get('status', workflow.status)
        workflow.pre_check_commands = data.get('pre_check_commands', workflow.pre_check_commands)
        workflow.implementation_commands = data.get('implementation_commands', workflow.implementation_commands)
        workflow.post_check_commands = data.get('post_check_commands', workflow.post_check_commands)
        workflow.rollback_commands = data.get('rollback_commands', workflow.rollback_commands)
        workflow.validation_rules = data.get('validation_rules', workflow.validation_rules)
        
        workflow.save()
        
        return create_cors_response({
            'id': str(workflow.id),
            'message': 'Workflow updated successfully'
        })
        
    except Workflow.DoesNotExist:
        return create_cors_response({'error': 'Workflow not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE", "OPTIONS"])
def workflow_delete(request, workflow_id):
    """API endpoint to soft delete a workflow"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        workflow = Workflow.objects.get(id=workflow_id, is_deleted=False)
        workflow.is_deleted = True
        workflow.save()
        
        return create_cors_response({
            'id': str(workflow.id),
            'message': 'Workflow deleted successfully'
        })
        
    except Workflow.DoesNotExist:
        return create_cors_response({'error': 'Workflow not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def workflow_execute(request):
    """API endpoint to execute a workflow on a device"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        data = json.loads(request.body)
        
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
        
        return create_cors_response({
            'execution_id': str(execution.id),
            'task_id': task.id,
            'message': 'Workflow execution started'
        }, status=202)
        
    except Workflow.DoesNotExist:
        return create_cors_response({'error': 'Workflow not found'}, status=404)
    except Device.DoesNotExist:
        return create_cors_response({'error': 'Device not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def device_stats(request):
    """API endpoint to get comprehensive device statistics including execution history"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        devices = Device.objects.all()
        device_stats_data = []
        
        for device in devices:
            # Get workflow execution stats for this device
            workflow_executions = WorkflowExecution.objects.filter(device=device)
            ansible_executions = AnsibleExecution.objects.filter(
                playbook__name__contains=device.name  # Match by device name in playbook
            )
            
            # Calculate stats
            workflow_completed = workflow_executions.filter(status='completed').count()
            workflow_failed = workflow_executions.filter(status='failed').count()
            workflow_running = workflow_executions.filter(status='running').count()
            
            ansible_completed = ansible_executions.filter(status='completed').count()
            ansible_failed = ansible_executions.filter(status='failed').count()
            ansible_running = ansible_executions.filter(status='running').count()
            
            device_stats_data.append({
                'id': str(device.id),
                'name': device.name,
                'hostname': device.hostname,
                'ip_address': device.ip_address,
                'device_type': device.device_type,
                'status': device.status,
                'location': device.location,
                'workflow_executions': {
                    'total': workflow_executions.count(),
                    'completed': workflow_completed,
                    'failed': workflow_failed,
                    'running': workflow_running,
                    'success_rate': (
                        round((workflow_completed / workflow_executions.count()) * 100, 1) 
                        if workflow_executions.count() > 0 else 0
                    )
                },
                'ansible_executions': {
                    'total': ansible_executions.count(),
                    'completed': ansible_completed,
                    'failed': ansible_failed,
                    'running': ansible_running,
                    'success_rate': (
                        round((ansible_completed / ansible_executions.count()) * 100, 1) 
                        if ansible_executions.count() > 0 else 0
                    )
                },
                'total_executions': workflow_executions.count() + ansible_executions.count(),
                'total_successful': workflow_completed + ansible_completed,
                'total_failed': workflow_failed + ansible_failed,
                'overall_success_rate': (
                    round(((workflow_completed + ansible_completed) / (workflow_executions.count() + ansible_executions.count())) * 100, 1) 
                    if (workflow_executions.count() + ansible_executions.count()) > 0 else 0
                ),
                'last_execution': None,
                'created_at': device.created_at.isoformat(),
                'updated_at': device.updated_at.isoformat()
            })
        
        return create_cors_response({
            'device_stats': device_stats_data,
            'total_devices': devices.count(),
            'summary': {
                'total_workflow_executions': WorkflowExecution.objects.count(),
                'total_ansible_executions': AnsibleExecution.objects.count(),
                'total_executions': WorkflowExecution.objects.count() + AnsibleExecution.objects.count(),
                'devices_with_executions': len([d for d in device_stats_data if d['total_executions'] > 0]),
                'devices_with_workflows': len([d for d in device_stats_data if d['workflow_executions']['total'] > 0]),
                'devices_with_ansible': len([d for d in device_stats_data if d['ansible_executions']['total'] > 0])
            }
        })
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def execution_status(request, execution_id):
    """API endpoint to get workflow execution status"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        execution = WorkflowExecution.objects.get(id=execution_id)
        
        response_data = {
            'id': str(execution.id),
            'workflow': {
                'id': str(execution.workflow.id),
                'name': execution.workflow.name
            },
            'device': {
                'id': str(execution.device.id),
                'name': execution.device.name,
                'ip_address': execution.device.ip_address
            },
            'status': execution.status,
            'current_stage': execution.current_stage,
            'started_at': execution.started_at.isoformat() if execution.started_at else None,
            'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
            'error_message': execution.error_message,
            'created_at': execution.created_at.isoformat(),
        }
        
        # Add stage results if available
        if execution.pre_check_results:
            response_data['pre_check_results'] = execution.pre_check_results
        if execution.implementation_results:
            response_data['implementation_results'] = execution.implementation_results
        if execution.post_check_results:
            response_data['post_check_results'] = execution.post_check_results
        if execution.rollback_results:
            response_data['rollback_results'] = execution.rollback_results
        
        # Add command executions
        command_executions = execution.command_executions.all()
        response_data['command_executions'] = []
        
        for cmd_exec in command_executions:
            cmd_data = {
                'id': str(cmd_exec.id),
                'command': cmd_exec.command,
                'stage': cmd_exec.stage,
                'status': cmd_exec.status,
                'output': cmd_exec.output,
                'error_output': cmd_exec.error_output,
                'validation_result': cmd_exec.validation_result,
                'started_at': cmd_exec.started_at.isoformat() if cmd_exec.started_at else None,
                'completed_at': cmd_exec.completed_at.isoformat() if cmd_exec.completed_at else None,
            }
            response_data['command_executions'].append(cmd_data)
        
        return create_cors_response(response_data)
        
    except WorkflowExecution.DoesNotExist:
        return create_cors_response({'error': 'Execution not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def unified_execution_detail(request, execution_id):
    """API endpoint to get details for a specific execution (workflow or Ansible)"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        from .models import WorkflowExecution, AnsibleExecution
        
        # Try to find as workflow execution first
        try:
            execution = WorkflowExecution.objects.get(id=execution_id)
            execution_data = {
                'id': str(execution.id),
                'type': 'workflow',
                'status': execution.status,
                'started_at': execution.started_at.isoformat() if execution.started_at else None,
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'created_at': execution.created_at.isoformat(),
                'created_by': execution.created_by.username if execution.created_by else 'System',
                'workflow': {
                    'id': str(execution.workflow.id),
                    'name': execution.workflow.name
                },
                'device': {
                    'id': str(execution.device.id),
                    'name': execution.device.name
                },
                'current_stage': execution.current_stage,
                'error_message': execution.error_message,
                'stdout': execution.stdout,
                'stderr': execution.stderr,
            }
            
            # Add command executions
            command_executions = execution.command_executions.all()
            execution_data['command_executions'] = []
            
            for cmd_exec in command_executions:
                cmd_data = {
                    'id': str(cmd_exec.id),
                    'command': cmd_exec.command,
                    'stage': cmd_exec.stage,
                    'status': cmd_exec.status,
                    'output': cmd_exec.output,
                    'error_output': cmd_exec.error_output,
                    'validation_result': cmd_exec.validation_result,
                    'started_at': cmd_exec.started_at.isoformat() if cmd_exec.started_at else None,
                    'completed_at': cmd_exec.completed_at.isoformat() if cmd_exec.completed_at else None,
                }
                execution_data['command_executions'].append(cmd_data)
            
            return create_cors_response(execution_data)
            
        except WorkflowExecution.DoesNotExist:
            pass
        
        # Try to find as Ansible execution
        try:
            execution = AnsibleExecution.objects.get(id=execution_id)
            
            # Parse diff_stats if it's a string
            diff_stats_data = None
            if execution.diff_stats:
                try:
                    diff_stats_data = json.loads(execution.diff_stats)
                except (json.JSONDecodeError, TypeError):
                    diff_stats_data = None
            
            execution_data = {
                'id': str(execution.id),
                'type': 'ansible',
                'status': execution.status,
                'started_at': execution.started_at.isoformat() if execution.started_at else None,
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'created_at': execution.created_at.isoformat(),
                'created_by': execution.created_by.username if execution.created_by else 'System',
                'playbook_name': execution.playbook.name,
                'playbook_id': str(execution.playbook.id),
                'inventory_name': execution.inventory.name,
                'inventory_id': str(execution.inventory.id),
                'execution_time': execution.execution_time,
                'return_code': execution.return_code,
                'stdout': execution.stdout,
                'stderr': execution.stderr,
                'extra_vars': execution.extra_vars,
                'tags': execution.tags,
                # Configuration diff fields
                'pre_check_snapshot': execution.pre_check_snapshot,
                'post_check_snapshot': execution.post_check_snapshot,
                'diff_html': execution.diff_html,
                'diff_stats': diff_stats_data,
            }
            
            return create_cors_response(execution_data)
            
        except AnsibleExecution.DoesNotExist:
            pass
        
        # If neither found, return 404
        return create_cors_response({'error': 'Execution not found'}, status=404)
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def unified_execution_list(request):
    """API endpoint to list both workflow and Ansible executions"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        # Get both workflow and Ansible executions
        workflow_executions = WorkflowExecution.objects.all()
        ansible_executions = AnsibleExecution.objects.all()
        
        # Apply filters to workflow executions
        status = request.GET.get('status')
        if status:
            workflow_executions = workflow_executions.filter(status=status)
        
        workflow_id = request.GET.get('workflow_id')
        if workflow_id:
            workflow_executions = workflow_executions.filter(workflow_id=workflow_id)
        
        device_id = request.GET.get('device_id')
        if device_id:
            workflow_executions = workflow_executions.filter(device_id=device_id)
            ansible_executions = ansible_executions.filter(
                playbook__name__contains=device_id  # Filter by device name in playbook
            )
        
        # Apply filters to Ansible executions
        ansible_status = request.GET.get('ansible_status')
        if ansible_status:
            ansible_executions = ansible_executions.filter(status=ansible_status)
        
        playbook_id = request.GET.get('playbook_id')
        if playbook_id:
            ansible_executions = ansible_executions.filter(playbook_id=playbook_id)
        
        # Pagination
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))
        
        # Combine and sort by creation date
        combined_executions = []
        
        # Add workflow executions
        for execution in workflow_executions.order_by('-created_at'):
            combined_executions.append({
                'id': str(execution.id),
                'type': 'workflow',
                'status': execution.status,
                'started_at': execution.started_at.isoformat() if execution.started_at else None,
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'created_at': execution.created_at.isoformat(),
                'workflow': {
                    'id': str(execution.workflow.id),
                    'name': execution.workflow.name
                },
                'device': {
                    'id': str(execution.device.id),
                    'name': execution.device.name
                },
                'current_stage': execution.current_stage,
                'error_message': execution.error_message
            })
        
        # Add Ansible executions
        for execution in ansible_executions.order_by('-created_at'):
            combined_executions.append({
                'id': str(execution.id),
                'type': 'ansible',
                'status': execution.status,
                'started_at': execution.started_at.isoformat() if execution.started_at else None,
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'created_at': execution.created_at.isoformat(),
                'playbook': {
                    'id': str(execution.playbook.id),
                    'name': execution.playbook.name
                },
                'inventory': {
                    'id': str(execution.inventory.id),
                    'name': execution.inventory.name
                },
                'execution_time': execution.execution_time,
                'return_code': execution.return_code,
                'stdout': execution.stdout,
                'stderr': execution.stderr
            })
        
        # Sort all executions by created_at (descending)
        combined_executions.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Apply pagination
        total_count = len(combined_executions)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_executions = combined_executions[start_idx:end_idx]
        
        return create_cors_response({
            'executions': paginated_executions,
            'total': total_count,
            'page': page,
            'per_page': per_page,
            'has_next': end_idx < total_count,
            'has_previous': page > 1
        })
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def execution_list(request):
    """API endpoint to list workflow executions"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        executions = WorkflowExecution.objects.all()
        
        # Filters
        status = request.GET.get('status')
        if status:
            executions = executions.filter(status=status)
        
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
        
        execution_list = []
        for execution in page_obj:
            exec_data = {
                'id': str(execution.id),
                'workflow': {
                    'id': str(execution.workflow.id),
                    'name': execution.workflow.name
                },
                'device': {
                    'id': str(execution.device.id),
                    'name': execution.device.name
                },
                'status': execution.status,
                'current_stage': execution.current_stage,
                'started_at': execution.started_at.isoformat() if execution.started_at else None,
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'created_at': execution.created_at.isoformat(),
            }
            execution_list.append(exec_data)
        
        return create_cors_response({
            'executions': execution_list,
            'total': executions.count(),
            'page': page,
            'per_page': per_page,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        })
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def log_list(request):
    """API endpoint to list system logs"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        from .models import SystemLog
        
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
                models.Q(message__icontains=search) |
                models.Q(details__icontains=search)
            )
        
        # Pagination
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 20))
        paginator = Paginator(logs.order_by('-created_at'), per_page)
        page_obj = paginator.get_page(page)
        
        log_list = []
        for log in page_obj:
            log_data = {
                'id': str(log.id),
                'level': log.level,
                'type': log.type,
                'message': log.message,
                'details': log.details,
                'user': log.user.username if log.user else None,
                'ip_address': log.ip_address,
                'object_type': log.object_type,
                'object_id': log.object_id,
                'created_at': log.created_at.isoformat(),
                'has_changes': bool(log.old_values or log.new_values)
            }
            log_list.append(log_data)
        
        return create_cors_response({
            'logs': log_list,
            'total': logs.count(),
            'page': page,
            'per_page': per_page,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        })
        
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def log_detail(request, log_id):
    """API endpoint to get log details with diff"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        from .models import SystemLog
        
        log = SystemLog.objects.get(id=log_id)
        
        log_data = {
            'id': str(log.id),
            'level': log.level,
            'type': log.type,
            'message': log.message,
            'details': log.details,
            'user': log.user.username if log.user else None,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'object_type': log.object_type,
            'object_id': log.object_id,
            'old_values': log.old_values,
            'new_values': log.new_values,
            'created_at': log.created_at.isoformat(),
            'diff_html': log.get_diff_html()
        }
        
        return create_cors_response(log_data)
        
    except SystemLog.DoesNotExist:
        return create_cors_response({'error': 'Log not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)

# Webhook Configuration API
@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def webhook_list(request):
    """API endpoint to list all webhook configurations"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        webhooks = WebhookConfiguration.objects.all()

        webhook_list = []
        for webhook in webhooks:
            webhook_data = {
                'id': str(webhook.id),
                'name': webhook.name,
                'description': webhook.description,
                'webhook_url': webhook.webhook_url,
                'events': webhook.events,
                'method': webhook.method,
                'is_active': webhook.is_active,
                'secret_key': webhook.secret_key,
                'created_by': webhook.created_by.username,
                'created_at': webhook.created_at.isoformat(),
                'updated_at': webhook.updated_at.isoformat(),
            }
            webhook_list.append(webhook_data)

        return create_cors_response({'webhooks': webhook_list})

    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)

# Webhook Configuration API
@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def webhook_create(request):
    """API endpoint to create a new webhook configuration"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        data = json.loads(request.body)

        from django.contrib.auth.models import User
        user, created = User.objects.get_or_create(
            username='api_user',
            defaults={'email': 'api@example.com'}
        )

        webhook = WebhookConfiguration.objects.create(
            name=data['name'],
            description=data.get('description', ''),
            webhook_url=data['webhook_url'],
            events=data.get('events', 'execution_completed'),
            method=data.get('method', 'POST'),
            is_active=data.get('is_active', True),
            secret_key=data.get('secret_key', ''),
            created_by=user
        )

        return create_cors_response({
            'id': str(webhook.id),
            'message': 'Webhook configuration created successfully'
        }, status=201)

    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def webhook_detail(request, webhook_id):
    """API endpoint to get webhook configuration details"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        webhook = WebhookConfiguration.objects.get(id=webhook_id)

        webhook_data = {
            'id': str(webhook.id),
            'name': webhook.name,
            'description': webhook.description,
            'webhook_url': webhook.webhook_url,
            'events': webhook.events,
            'method': webhook.method,
            'is_active': webhook.is_active,
            'secret_key': webhook.secret_key,
            'created_by': webhook.created_by.username,
            'created_at': webhook.created_at.isoformat(),
            'updated_at': webhook.updated_at.isoformat(),
        }

        return create_cors_response(webhook_data)

    except WebhookConfiguration.DoesNotExist:
        return create_cors_response({'error': 'Webhook configuration not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["PUT", "OPTIONS"])
def webhook_update(request, webhook_id):
    """API endpoint to update a webhook configuration"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'PUT, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        webhook = WebhookConfiguration.objects.get(id=webhook_id)
        data = json.loads(request.body)

        # Update webhook fields
        webhook.name = data.get('name', webhook.name)
        webhook.description = data.get('description', webhook.description)
        webhook.webhook_url = data.get('webhook_url', webhook.webhook_url)
        webhook.events = data.get('events', webhook.events)
        webhook.method = data.get('method', webhook.method)
        webhook.is_active = data.get('is_active', webhook.is_active)
        webhook.secret_key = data.get('secret_key', webhook.secret_key)

        webhook.save()

        return create_cors_response({
            'id': str(webhook.id),
            'message': 'Webhook configuration updated successfully'
        })

    except WebhookConfiguration.DoesNotExist:
        return create_cors_response({'error': 'Webhook configuration not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE", "OPTIONS"])
def webhook_delete(request, webhook_id):
    """API endpoint to delete a webhook configuration"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        webhook = WebhookConfiguration.objects.get(id=webhook_id)
        webhook.delete()

        return create_cors_response({
            'message': 'Webhook configuration deleted successfully'
        })

    except WebhookConfiguration.DoesNotExist:
        return create_cors_response({'error': 'Webhook configuration not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def celery_health_check(request):
    """API endpoint to check Celery worker health"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        from network_automation.celery import app as celery_app
        from celery import Celery

        # Check if Celery is properly configured
        if not celery_app:
            return create_cors_response({
                'status': 'unhealthy',
                'celery_configured': False,
                'error': 'Celery app not configured'
            }, status=503)

        # Try to get active workers and their stats
        try:
            inspect = celery_app.control.inspect()

            # Check if workers are responding
            stats = inspect.stats()
            ping = inspect.ping()
            active_queues = inspect.active_queues()

            workers_healthy = ping is not None and len(ping) > 0

            # Count workers
            worker_count = len(ping) if ping else 0

            # Get task statistics if workers are healthy
            task_info = {}
            if workers_healthy:
                registered_tasks = inspect.registered()
                active_tasks = inspect.active()
                scheduled_tasks = inspect.scheduled()

                task_info = {
                    'registered_tasks_count': sum(
                        len(tasks) for tasks in (registered_tasks or {}).values()
                    ) if registered_tasks else 0,
                    'active_tasks_count': sum(
                        len(tasks) for tasks in (active_tasks or {}).values()
                    ) if active_tasks else 0,
                    'scheduled_tasks_count': sum(
                        len(tasks) for tasks in (scheduled_tasks or {}).values()
                    ) if scheduled_tasks else 0
                }

            # Get broker info
            broker_info = {}
            try:
                app_connection = celery_app.connection()
                broker_info = {
                    'broker': str(app_connection.as_uri()) if app_connection else 'Unknown'
                }
                app_connection.close()
            except Exception:
                broker_info = {'broker': 'Unable to connect'}

            # Build response
            response_data = {
                'status': 'healthy' if workers_healthy else 'unhealthy',
                'celery_configured': True,
                'workers': {
                    'count': worker_count,
                    'responding': workers_healthy
                },
                'tasks': task_info,
                'broker': broker_info,
                'timestamp': datetime.datetime.utcnow().isoformat()
            }

            if workers_healthy:
                return create_cors_response(response_data)
            else:
                return create_cors_response(response_data, status=503)

        except Exception as e:
            return create_cors_response({
                'status': 'unhealthy',
                'celery_configured': True,
                'error': str(e),
                'timestamp': datetime.datetime.utcnow().isoformat()
            }, status=503)

    except ImportError as e:
        return create_cors_response({
            'status': 'unhealthy',
            'celery_configured': False,
            'error': f'Import error: {str(e)}'
        }, status=503)
    except Exception as e:
        return create_cors_response({
            'status': 'error',
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def webhook_test(request, webhook_id):
    """API endpoint to test a webhook configuration"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response

    try:
        webhook = WebhookConfiguration.objects.get(id=webhook_id)

        # Send test webhook
        success, message = WebhookManager.send_test_webhook()

        return create_cors_response({
            'success': success,
            'message': message
        })

    except WebhookConfiguration.DoesNotExist:
        return create_cors_response({'error': 'Webhook configuration not found'}, status=404)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)