"""
URL configuration for network_automation project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView
)
from automation.views_swagger import CustomSpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('automation.urls')),
    path('api/', include('automation.api_urls')),
    
    # Swagger/OpenAPI documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', CustomSpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)