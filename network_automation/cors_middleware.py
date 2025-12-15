"""
Simple CORS middleware for Django without external dependencies.
This provides basic CORS support for development.
"""


class CORSMiddleware:
    """
    Simple CORS middleware that allows cross-origin requests.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)

        # Get allowed origins from settings
        from django.conf import settings
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])

        # Get the request origin
        origin = request.headers.get('Origin')

        # Set CORS headers based on origin
        if origin and origin in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        elif not origin:
            # Same-origin request, no CORS headers needed
            pass
        else:
            # Origin not allowed, don't set CORS headers
            pass

        response['Access-Control-Allow-Methods'] = (
            'GET, POST, PUT, DELETE, OPTIONS'
        )
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization, X-Requested-With, X-CSRFToken'
        )

        return response