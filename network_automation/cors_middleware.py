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
        
        # Add CORS headers
        origin = request.headers.get('Origin', '*')
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Methods'] = (
            'GET, POST, PUT, DELETE, OPTIONS'
        )
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization, X-Requested-With, X-CSRFToken'
        )
        
        return response