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