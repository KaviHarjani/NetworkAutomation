from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_auth_views
from .api_views import device_grouping, assign_workflow_to_group, execute_workflow_api
from .api_viewsets import (
    DeviceViewSet, WorkflowViewSet, ExecutionViewSet, LogViewSet
)

app_name = 'automation_api'

# Create a router and register our ViewSets with it
router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'executions', ExecutionViewSet, basename='execution')
router.register(r'logs', LogViewSet, basename='log')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints (keeping these as function-based views)
    path('auth/csrf-token/', api_auth_views.api_csrf_token, 
         name='api_csrf_token'),
    path('auth/login/', api_auth_views.api_login, name='api_login'),
    path('auth/logout/', api_auth_views.api_logout, name='api_logout'),
    path('auth/user/', api_auth_views.api_user, name='api_user'),
    # Device grouping and mapping endpoints
    path('devices/groupings/', device_grouping, name='device_groupings'),
    path('devices/assign-workflow/', assign_workflow_to_group, name='assign_workflow_to_group'),
    path('executions/execute/', execute_workflow_api, name='execute_workflow'),
]