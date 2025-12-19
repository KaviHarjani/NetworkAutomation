"""
CSRF-exempt views for Ansible validation endpoints
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .ansible_utils import validate_ansible_playbook_content, validate_ansible_inventory_content
import json


def create_cors_response(data, status=200):
    """Create JSON response with CORS headers"""
    response = JsonResponse(data, status=status)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    cors_headers = 'Content-Type, Authorization, X-Requested-With, X-CSRFToken, Accept, Accept-Encoding'
    response['Access-Control-Allow-Headers'] = cors_headers
    return response


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def ansible_playbook_validate(request):
    """CSRF-exempt endpoint for validating Ansible playbook syntax"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            playbook_content = data.get('playbook_content', '')
        else:
            playbook_content = request.POST.get('playbook_content', '')

        if not playbook_content:
            return create_cors_response({
                'error': 'playbook_content is required'
            }, status=400)

        validation_result = validate_ansible_playbook_content(playbook_content)
        return create_cors_response(validation_result)

    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def ansible_inventory_validate(request):
    """CSRF-exempt endpoint for validating Ansible inventory syntax"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            inventory_content = data.get('inventory_content', '')
        else:
            inventory_content = request.POST.get('inventory_content', '')

        if not inventory_content:
            return create_cors_response({
                'error': 'inventory_content is required'
            }, status=400)

        validation_result = validate_ansible_inventory_content(inventory_content)
        return create_cors_response(validation_result)

    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def ansible_playbook_execute_dynamic(request):
    """Execute Ansible playbook with dynamic variables via API"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            playbook_content = data.get('playbook_content', '')
            variables = data.get('variables', {})
            inventory_content = data.get('inventory_content', 'localhost ansible_connection=local')
        else:
            playbook_content = request.POST.get('playbook_content', '')
            variables = json.loads(request.POST.get('variables', '{}'))
            inventory_content = request.POST.get('inventory_content', 'localhost ansible_connection=local')

        # Validate playbook content
        if not playbook_content:
            return create_cors_response({
                'error': 'playbook_content is required'
            }, status=400)

        # Validate variables (must be a dictionary)
        if not isinstance(variables, dict):
            return create_cors_response({
                'error': 'variables must be a JSON object'
            }, status=400)

        # Default variables template
        default_variables = {
            "nginx_port": 8080,
            "app_name": "Network Automation Demo",
            "web_root": "/var/www/html",
            "config_backup": True
        }

        # Merge with provided variables (provided variables override defaults)
        final_variables = {**default_variables, **variables}

        # Validate playbook
        validation_result = validate_ansible_playbook_content(playbook_content)
        if not validation_result['valid']:
            return create_cors_response({
                'error': 'Invalid playbook',
                'validation_error': validation_result['error']
            }, status=400)

        # Execute playbook with dynamic variables
        from .ansible_utils import AnsibleRunner
        runner = AnsibleRunner()
        
        # Execute synchronously for demo (in production, use Celery)
        execution_result = runner.execute_playbook(
            playbook_content=playbook_content,
            inventory_content=inventory_content,
            extra_vars=final_variables
        )

        # Format response
        response_data = {
            'success': execution_result['return_code'] == 0,
            'execution_time': execution_result['execution_time'],
            'variables_used': final_variables,
            'playbook_info': {
                'valid': True,
                'plays': validation_result.get('plays', 1)
            }
        }

        if execution_result['return_code'] == 0:
            response_data['result'] = execution_result['stdout']
        else:
            response_data['error'] = execution_result['stderr']

        return create_cors_response(response_data)

    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def ansible_playbook_execute_variables(request):
    """Execute pre-configured Ansible playbook with dynamic variables via API"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            variables = data.get('variables', {})
            inventory_content = data.get('inventory_content', 'localhost ansible_connection=local')
        else:
            variables = json.loads(request.POST.get('variables', '{}'))
            inventory_content = request.POST.get('inventory_content', 'localhost ansible_connection=local')

        # Validate variables (must be a dictionary)
        if not isinstance(variables, dict):
            return create_cors_response({
                'error': 'variables must be a JSON object'
            }, status=400)

        # Default variables template
        default_variables = {
            "nginx_port": 8080,
            "app_name": "Network Automation Demo",
            "web_root": "/var/www/html",
            "config_backup": True
        }

        # Merge with provided variables (provided variables override defaults)
        final_variables = {**default_variables, **variables}

        # Pre-configured playbook content (system default)
        playbook_content = """---
- name: Network Automation Demo with Variables
  hosts: localhost
  become: yes
  vars:
    nginx_port: "{{ nginx_port }}"
    app_name: "{{ app_name }}"
    web_root: "{{ web_root }}"
    config_backup: "{{ config_backup }}"
  tasks:
    - name: Display application configuration
      debug:
        msg: |
          Application: {{ app_name }}
          Nginx Port: {{ nginx_port }}
          Web Root: {{ web_root }}
          Backup Config: {{ config_backup }}
    
    - name: Show system information
      debug:
        msg: |
          System ready for {{ app_name }} deployment
          Listening on port {{ nginx_port }}
          Document root: {{ web_root }}
    - name: Configuration backup status
      debug:
        msg: |
          Configuration backup is {% if config_backup %}enabled{% else %}disabled{% endif %}
"""

        # Validate playbook (should always pass as it's pre-configured)
        validation_result = validate_ansible_playbook_content(playbook_content)
        if not validation_result['valid']:
            return create_cors_response({
                'error': 'Internal error: Pre-configured playbook is invalid',
                'validation_error': validation_result['error']
            }, status=500)

        # Execute playbook with dynamic variables
        from .ansible_utils import AnsibleRunner
        runner = AnsibleRunner()
        
        # Execute synchronously for demo
        execution_result = runner.execute_playbook(
            playbook_content=playbook_content,
            inventory_content=inventory_content,
            extra_vars=final_variables
        )

        # Format response
        response_data = {
            'success': execution_result['return_code'] == 0,
            'execution_time': execution_result['execution_time'],
            'variables_used': final_variables,
            'playbook_info': {
                'valid': True,
                'plays': validation_result.get('plays', 1),
                'name': 'Network Automation Demo with Variables',
                'description': 'Pre-configured playbook for network automation with dynamic variables'
            }
        }

        if execution_result['return_code'] == 0:
            response_data['result'] = execution_result['stdout']
        else:
            response_data['error'] = execution_result['stderr']

        return create_cors_response(response_data)

    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def ansible_playbook_execute_on_device_background(request):
    """Execute Ansible playbook on a device via API in background using Celery"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        # Parse request data
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()
        
        # Extract required fields
        device_id = data.get('device_id')
        playbook_content = data.get('playbook_content')
        variables = data.get('variables', {})
        tags = data.get('tags', [])
        skip_tags = data.get('skip_tags', [])
        
        # Validate required fields
        if not device_id:
            return create_cors_response({
                'error': 'device_id is required'
            }, status=400)
        
        if not playbook_content:
            return create_cors_response({
                'error': 'playbook_content is required'
            }, status=400)
        
        # Validate variables (must be a dictionary)
        if not isinstance(variables, dict):
            return create_cors_response({
                'error': 'variables must be a JSON object'
            }, status=400)
        
        # Validate tags and skip_tags (must be lists)
        if not isinstance(tags, list):
            return create_cors_response({
                'error': 'tags must be a list'
            }, status=400)
        
        if not isinstance(skip_tags, list):
            return create_cors_response({
                'error': 'skip_tags must be a list'
            }, status=400)
        
        # Validate playbook content
        validation_result = validate_ansible_playbook_content(playbook_content)
        if not validation_result.get('valid', False):
            return create_cors_response({
                'error': 'Invalid playbook content',
                'validation_error': validation_result.get('error', 'Unknown validation error')
            }, status=400)
        
        # Get device from database
        from .models import Device
        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return create_cors_response({
                'error': f'Device with ID {device_id} not found'
            }, status=404)
        
        # Submit task to Celery for background execution
        from automation.tasks import execute_ansible_playbook_on_device_task
        
        # Apply the task asynchronously
        task_result = execute_ansible_playbook_on_device_task.delay(
            device_id,
            playbook_content,
            variables=variables,
            tags=tags if tags else None,
            skip_tags=skip_tags if skip_tags else None
        )
        
        # Return immediately with task ID for status checking
        response_data = {
            'success': True,
            'task_id': task_result.id,
            'status': 'submitted',
            'message': 'Ansible playbook execution started in background',
            'device_info': {
                'id': device.id,
                'name': device.name,
                'hostname': device.hostname or device.name,
                'ip_address': device.ip_address,
                'device_type': device.device_type
            },
            'playbook_info': {
                'valid': True,
                'plays': validation_result.get('plays', 1)
            }
        }
        
        # Return result with CORS headers
        return create_cors_response(response_data, status=202)  # 202 Accepted
        
    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def ansible_playbook_execute_on_device(request):
    """Execute Ansible playbook on a specific device via API"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        # Parse request data
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()
        
        # Extract required fields
        device_id = data.get('device_id')
        playbook_id = data.get('playbook_id')
        playbook_name = data.get('playbook_name')
        variables = data.get('variables', {})
        tags = data.get('tags', [])
        skip_tags = data.get('skip_tags', [])
        
        # Validate required fields
        if not device_id:
            return create_cors_response({
                'error': 'device_id is required'
            }, status=400)
        
        # Validate that either playbook_id or playbook_name is provided
        if not playbook_id and not playbook_name:
            return create_cors_response({
                'error': 'Either playbook_id or playbook_name is required'
            }, status=400)
        
        if playbook_id and playbook_name:
            return create_cors_response({
                'error': 'Provide either playbook_id or playbook_name, not both'
            }, status=400)
        
        # Validate variables (must be a dictionary)
        if not isinstance(variables, dict):
            return create_cors_response({
                'error': 'variables must be a JSON object'
            }, status=400)
        
        # Validate tags and skip_tags (must be lists)
        if not isinstance(tags, list):
            return create_cors_response({
                'error': 'tags must be a list'
            }, status=400)
        
        if not isinstance(skip_tags, list):
            return create_cors_response({
                'error': 'skip_tags must be a list'
            }, status=400)
        
        # Get device from database
        from .models import Device, AnsiblePlaybook
        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return create_cors_response({
                'error': f'Device with ID {device_id} not found'
            }, status=404)
        
        # Get playbook from database using either ID or name
        try:
            if playbook_id:
                playbook = AnsiblePlaybook.objects.get(id=playbook_id)
            else:  # playbook_name
                playbook = AnsiblePlaybook.objects.get(name=playbook_name)
            
            playbook_content = playbook.playbook_content
        except AnsiblePlaybook.DoesNotExist:
            search_param = playbook_id or playbook_name
            return create_cors_response({
                'error': f'Playbook with {"ID" if playbook_id else "name"} {search_param} not found'
            }, status=404)
        
        # Execute playbook on device
        from .ansible_utils import execute_ansible_playbook_on_device
        result = execute_ansible_playbook_on_device(
            device=device,
            playbook_content=playbook_content,
            variables=variables,
            tags=tags if tags else None,
            skip_tags=skip_tags if skip_tags else None
        )
        
        # Return result with CORS headers
        return create_cors_response(result, status=200 if result.get('success') else 400)
        
    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)