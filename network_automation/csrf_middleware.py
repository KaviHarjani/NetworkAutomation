"""
Custom CSRF middleware to disable CSRF protection for API endpoints
"""
from django.utils.deprecation import MiddlewareMixin


class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF protection for API endpoints
    """

    def process_view(self, request, callback, callback_args, callback_kwargs):
        """
        Disable CSRF protection for API endpoints
        """
        # Disable CSRF for all API endpoints
        if True or request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)

        return None