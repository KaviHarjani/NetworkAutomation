"""
Generic automation endpoint that intelligently routes requests to the correct 
Ansible playbook based on device metadata and workflow type.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
from .models import Device, DevicePlaybookMapping, AnsibleExecution, AnsibleInventory, AnsiblePlaybook
from .ansible_utils import generate_device_inventory
from .tasks import execute_ansible_playbook_task


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
@require_http_methods(["POST", "OPTIONS"])
def generic_automation_execute(request):
    """
    Generic automation endpoint that intelligently routes requests to the correct 
    Ansible playbook based on device metadata and workflow type.
    
    Expected JSON payload:
    {
        "hostname": "sw-core-01",
        "workflow": "reboot",
        "params": {
            "delay": 300,
            "save_config": true
        }
    }
    """
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
        hostname = data.get('hostname')
        workflow_type = data.get('workflow')
        params = data.get('params', {})
        
        # Validate required fields
        if not hostname or not workflow_type:
            return create_cors_response({
                'error': 'hostname and workflow are required'
            }, status=400)
        
        # Find device by hostname
        try:
            device = Device.objects.get(hostname=hostname)
        except Device.DoesNotExist:
            return create_cors_response({
                'error': f'Device with hostname {hostname} not found'
            }, status=404)
        
        # Find matching device-playbook mapping
        mappings = DevicePlaybookMapping.objects.filter(
            workflow_type=workflow_type,
            is_active=True
        ).order_by('-priority')
        
        # Find the best matching mapping
        matching_mapping = None
        for mapping in mappings:
            if mapping.matches_device(device):
                matching_mapping = mapping
                break
        
        if not matching_mapping:
            return create_cors_response({
                'error': f'No active playbook mapping found for workflow type "{workflow_type}" and device {hostname} ({device.vendor} {device.model} {device.os_version})'
            }, status=404)
        
        # Validate required parameters for this mapping
        required_params = matching_mapping.get_required_params()
        missing_params = [param for param in required_params if param not in params]
        
        if missing_params:
            return create_cors_response({
                'error': f'Missing required parameters: {missing_params}',
                'required_params': required_params
            }, status=400)
        
        # Merge default variables with provided parameters
        default_vars = matching_mapping.get_default_variables()
        final_variables = {**default_vars, **params}
        final_variables.update({
            'device_name': device.name,
            'device_hostname': device.hostname or device.name,
            'device_ip': device.ip_address,
            'device_type': device.device_type,
            'device_vendor': device.vendor or "unknown",
            'device_model': device.model or "unknown",
            'workflow_type': workflow_type
        })
        
        # Create Ansible execution record
        from django.contrib.auth.models import User
        user, created = User.objects.get_or_create(
            username='api_user',
            defaults={'email': 'api@example.com'}
        )
        
        # Create temporary inventory for this device
        inventory_content = generate_device_inventory(device)
        
        # Create temporary inventory and execution records
        temp_inventory = AnsibleInventory.objects.create(
            name=f"Temp_Inventory_{device.name}_{int(time.time())}",
            description=f"Temporary inventory for device {device.name}",
            inventory_content=inventory_content,
            is_temporary=True,  # Mark as temporary to hide from UI
            created_by=user
        )
        
        execution_record = AnsibleExecution.objects.create(
            playbook=matching_mapping.playbook,
            inventory=temp_inventory,
            status='pending',
            created_by=user
        )
        
        # Set extra variables
        execution_record.set_extra_vars(final_variables)
        execution_record.save()
        
        # Start async execution
        task = execute_ansible_playbook_task.delay(str(execution_record.id))
        
        # Return success response
        return create_cors_response({
            'execution_id': str(execution_record.id),
            'task_id': task.id,
            'message': 'Generic automation execution started successfully',
            'device_info': {
                'hostname': device.hostname,
                'name': device.name,
                'ip_address': device.ip_address,
                'device_type': device.device_type,
                'vendor': device.vendor,
                'model': device.model,
                'os_version': device.os_version
            },
            'playbook_info': {
                'id': str(matching_mapping.playbook.id),
                'name': matching_mapping.playbook.name,
                'description': matching_mapping.playbook.description
            },
            'workflow_type': workflow_type,
            'mapping_used': {
                'id': str(matching_mapping.id),
                'name': matching_mapping.name,
                'priority': matching_mapping.priority
            },
            'variables_used': final_variables
        }, status=202)
        
    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def device_playbook_mappings(request, mapping_id=None):
    """
    API endpoint to manage device-playbook mappings
    - GET: List all mappings
    - POST: Create new mapping
    - PUT: Update existing mapping
    - DELETE: Delete mapping
    """
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        # Handle GET request - list all mappings
        if request.method == 'GET':
            mappings = DevicePlaybookMapping.objects.all().order_by('-priority')
            
            mapping_list = []
            for mapping in mappings:
                # Get target devices info
                target_devices = mapping.target_devices.all()
                target_devices_info = [
                    {
                        'id': str(device.id),
                        'name': device.name,
                        'hostname': device.hostname,
                        'vendor': device.vendor,
                        'model': device.model,
                        'os_version': device.os_version,
                        'device_type': device.device_type
                    }
                    for device in target_devices
                ]
                
                mapping_data = {
                    'id': str(mapping.id),
                    'name': mapping.name,
                    'description': mapping.description,
                    'workflow_type': mapping.workflow_type,
                    'vendor': mapping.vendor,
                    'model': mapping.model,
                    'os_version': mapping.os_version,
                    'device_type': mapping.device_type,
                    'priority': mapping.priority,
                    'is_active': mapping.is_active,
                    'playbook_name': mapping.playbook.name,
                    'target_devices_info': target_devices_info,
                    'default_variables_dict': mapping.get_default_variables(),
                    'required_params_list': mapping.get_required_params(),
                    'created_at': mapping.created_at.isoformat()
                }
                mapping_list.append(mapping_data)
            
            return create_cors_response({
                'mappings': mapping_list,
                'total': mappings.count()
            })
        
        # Handle POST request - create new mapping
        elif request.method == 'POST':
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['name', 'workflow_type', 'playbook']
            for field in required_fields:
                if not data.get(field):
                    return create_cors_response({
                        'error': f'{field} is required'
                    }, status=400)
            
            # Get current user (for created_by)
            from django.contrib.auth.models import User
            user, created = User.objects.get_or_create(
                username='api_user',
                defaults={'email': 'api@example.com'}
            )
            
            # Create the mapping
            try:
                playbook = AnsiblePlaybook.objects.get(id=data['playbook'])
            except AnsiblePlaybook.DoesNotExist:
                return create_cors_response({
                    'error': 'Playbook not found'
                }, status=400)
            
            mapping = DevicePlaybookMapping.objects.create(
                name=data['name'],
                description=data.get('description', ''),
                workflow_type=data['workflow_type'],
                playbook=playbook,
                priority=data.get('priority', 100),
                is_active=data.get('is_active', True),
                vendor=data.get('vendor', ''),
                model=data.get('model', ''),
                os_version=data.get('os_version', ''),
                device_type=data.get('device_type', ''),
                created_by=user
            )
            
            # Set default variables and required params
            if data.get('default_variables_dict'):
                mapping.set_default_variables(data['default_variables_dict'])
            if data.get('required_params_list'):
                mapping.set_required_params(data['required_params_list'])
            
            # Add target devices if specified
            if data.get('target_devices'):
                mapping.target_devices.set(data['target_devices'])
            
            mapping.save()
            
            return create_cors_response({
                'message': 'Mapping created successfully',
                'id': str(mapping.id)
            }, status=201)
        
        # Handle PUT request - update existing mapping
        elif request.method == 'PUT':
            if not mapping_id:
                return create_cors_response({
                    'error': 'Mapping ID is required for update'
                }, status=400)
            
            try:
                mapping = DevicePlaybookMapping.objects.get(id=mapping_id)
            except DevicePlaybookMapping.DoesNotExist:
                return create_cors_response({
                    'error': 'Mapping not found'
                }, status=404)
            
            data = json.loads(request.body)
            
            # Update fields
            if 'name' in data:
                mapping.name = data['name']
            if 'description' in data:
                mapping.description = data['description']
            if 'workflow_type' in data:
                mapping.workflow_type = data['workflow_type']
            if 'playbook' in data:
                try:
                    mapping.playbook = AnsiblePlaybook.objects.get(id=data['playbook'])
                except AnsiblePlaybook.DoesNotExist:
                    return create_cors_response({
                        'error': 'Playbook not found'
                    }, status=400)
            if 'priority' in data:
                mapping.priority = data['priority']
            if 'is_active' in data:
                mapping.is_active = data['is_active']
            if 'vendor' in data:
                mapping.vendor = data['vendor']
            if 'model' in data:
                mapping.model = data['model']
            if 'os_version' in data:
                mapping.os_version = data['os_version']
            if 'device_type' in data:
                mapping.device_type = data['device_type']
            
            # Update default variables and required params
            if 'default_variables_dict' in data:
                mapping.set_default_variables(data['default_variables_dict'])
            if 'required_params_list' in data:
                mapping.set_required_params(data['required_params_list'])
            
            # Update target devices if specified
            if 'target_devices' in data:
                mapping.target_devices.set(data['target_devices'])
            
            mapping.save()
            
            return create_cors_response({
                'message': 'Mapping updated successfully'
            })
        
        # Handle DELETE request - delete mapping
        elif request.method == 'DELETE':
            if not mapping_id:
                return create_cors_response({
                    'error': 'Mapping ID is required for deletion'
                }, status=400)
            
            try:
                mapping = DevicePlaybookMapping.objects.get(id=mapping_id)
                mapping.delete()
                return create_cors_response({
                    'message': 'Mapping deleted successfully'
                })
            except DevicePlaybookMapping.DoesNotExist:
                return create_cors_response({
                    'error': 'Mapping not found'
                }, status=404)
        
    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)