from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
import json


def create_cors_response(data, status=200):
    """Create JSON response with CORS headers"""
    response = JsonResponse(data, status=status)
    
    # Get the origin from request or use a specific origin for development
    origin = getattr(settings, 'CORS_ALLOW_ORIGIN', '*')
    
    response['Access-Control-Allow-Origin'] = origin
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = (
        'Content-Type, Authorization, X-Requested-With, X-CSRFToken'
    )
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Allow-Age'] = '86400'  # 24 hours
    
    return response


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def api_login(request):
    """API endpoint for user login"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization'
        )
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return create_cors_response({
                'error': 'Username and password are required'
            }, status=400)
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return create_cors_response({
                'message': 'Login successful',
                'user': {
                    'id': user.pk,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            })
        else:
            return create_cors_response({
                'error': 'Invalid credentials'
            }, status=401)
            
    except json.JSONDecodeError:
        return create_cors_response({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def api_logout(request):
    """API endpoint for user logout"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization'
        )
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    try:
        logout(request)
        return create_cors_response({'message': 'Logout successful'})
    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)


@require_http_methods(["GET", "OPTIONS"])
def api_user(request):
    """API endpoint to get current user info"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization'
        )
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    # Check authentication first
    if not request.user.is_authenticated:
        return create_cors_response({
            'error': 'User not authenticated'
        }, status=401)
    
    return create_cors_response({
        'id': request.user.pk,
        'username': request.user.username,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
    })


@require_http_methods(["GET", "OPTIONS"])
@csrf_exempt
def api_csrf_token(request):
    """API endpoint to get CSRF token for session-based authentication"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization'
        )
        response['Access-Control-Max-Age'] = '86400'
        return response
    
    # Return CSRF token - Django automatically sets this cookie
    return create_cors_response({'message': 'CSRF token set'})