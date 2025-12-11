from drf_spectacular.views import SpectacularSwaggerView
from django.template.response import TemplateResponse

class CustomSpectacularSwaggerView(SpectacularSwaggerView):
    """
    Custom Swagger UI view with modern styling and enhanced features
    """

    def get(self, request, *args, **kwargs):
        # Get the original response data
        response = super().get(request, *args, **kwargs)

        if hasattr(response, 'data') and 'schema' in response.data:
            # Render with our custom template
            return TemplateResponse(
                request,
                'swagger_ui.html',
                {
                    'schema': response.data['schema'],
                    'title': 'Network Automation API - Modern Docs',
                    'description': '🚀 Modern, comprehensive API documentation for Network Automation',
                    'version': '1.0.0',
                    'swagger_settings': {
                        'deepLinking': True,
                        'displayOperationId': True,
                        'defaultModelsExpandDepth': 1,
                        'defaultModelExpandDepth': 1,
                        'docExpansion': 'list',
                        'filter': True,
                        'persistAuthorization': True,
                        'displayRequestDuration': True,
                        'tryItOutEnabled': True,
                        'syntaxHighlight': {
                            'activated': True,
                            'theme': 'monokai'
                        }
                    }
                }
            )

        return response