from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import api_auth_views, api_views, csrf_exempt_views
from .api_views import (
    device_grouping,
    assign_workflow_to_group,
    assign_playbook_to_group,
    generate_group_inventory_api,
    execute_workflow_api,
    unified_execution_list,
    unified_execution_detail,
    celery_health_check
)
from .generic_automation_views import (
    generic_automation_execute,
    device_playbook_mappings
)
from .api_viewsets import (
    DeviceViewSet, WorkflowViewSet, ExecutionViewSet, LogViewSet
)
from .bpmn_viewsets import (
    WorkflowNodeViewSet, WorkflowEdgeViewSet, BPMNWorkflowViewSet,
    WorkflowExecutionPathViewSet
)
from .ansible_api_views import (
    AnsiblePlaybookViewSet, AnsibleInventoryViewSet, AnsibleExecutionViewSet
)
from .unified_log_views import UnifiedLogViewSet
from .unified_log_views import UnifiedLogViewSet

app_name = 'automation_api'

# Create a router and register our ViewSets with it
router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'executions', ExecutionViewSet, basename='execution')
router.register(r'logs', LogViewSet, basename='log')
router.register(r'workflow-nodes', WorkflowNodeViewSet, basename='workflow-node')
router.register(r'workflow-edges', WorkflowEdgeViewSet, basename='workflow-edge')
router.register(r'bpmn-workflows', BPMNWorkflowViewSet, basename='bpmn-workflow')
router.register(r'execution-paths', WorkflowExecutionPathViewSet, basename='execution-path')
router.register(r'ansible-playbooks', AnsiblePlaybookViewSet, basename='ansible-playbook')
router.register(r'ansible-inventories', AnsibleInventoryViewSet, basename='ansible-inventory')
router.register(r'ansible-executions', AnsibleExecutionViewSet, basename='ansible-execution')
router.register(r'unified-logs', UnifiedLogViewSet, basename='unified-log')

urlpatterns = [
    # Custom workflow create endpoint to match frontend expectations
    path('workflows/create/', api_views.workflow_create,
         name='workflow_create'),
    
    # Custom workflow delete endpoint
    path('workflows/<str:workflow_id>/delete/', api_views.workflow_delete,
         name='workflow_delete'),
    
    # CSRF-exempt Ansible validation endpoints - BEFORE router
    path('ansible-playbooks/validate/', csrf_exempt_views.ansible_playbook_validate,
         name='ansible_playbook_validate'),
    path('ansible-inventories/validate/', csrf_exempt_views.ansible_inventory_validate,
         name='ansible_inventory_validate'),
    # Synchronous Ansible playbook execution endpoint
    path('ansible/execute-sync/', csrf_exempt_views.ansible_playbook_execute_sync,
         name='ansible_playbook_execute_sync'),
    # Dynamic execution endpoint with variables - BEFORE router
    path('ansible-playbooks/execute-dynamic/', csrf_exempt_views.ansible_playbook_execute_dynamic,
         name='ansible_playbook_execute_dynamic'),
    # Variables-only execution endpoint (pre-configured playbook)
    path('ansible/execute-variables/', csrf_exempt_views.ansible_playbook_execute_variables,
         name='ansible_playbook_execute_variables'),
    # Device-specific execution endpoint (execute on specific device)
    path('ansible/execute-on-device/', csrf_exempt_views.ansible_playbook_execute_on_device,
         name='ansible_playbook_execute_on_device'),
    # Background device-specific execution endpoint (execute on device via Celery)
    path('ansible/execute-on-device-background/', csrf_exempt_views.ansible_playbook_execute_on_device_background,
         name='ansible_playbook_execute_on_device_background'),
    
    # Authentication endpoints (keeping these as function-based views)
    path('auth/csrf-token/', api_auth_views.api_csrf_token,
         name='api_csrf_token'),
    path('auth/login/', api_auth_views.api_login, name='api_login'),
    path('auth/logout/', api_auth_views.api_logout, name='api_logout'),
    path('auth/user/', api_auth_views.api_user, name='api_user'),
    
    # Device grouping and mapping endpoints
    path('devices/groupings/', device_grouping, name='device_groupings'),
    path('devices/assign-workflow/',
         assign_workflow_to_group,
         name='assign_workflow_to_group'),
    path('devices/assign-playbook/',
         assign_playbook_to_group,
         name='assign_playbook_to_group'),
    path('devices/generate-inventory/',
         generate_group_inventory_api,
         name='generate_group_inventory'),
    path('executions/execute/', execute_workflow_api, name='execute_workflow'),
    path('executions/unified/', unified_execution_list, name='unified_execution_list'),
    path('executions/unified/<uuid:execution_id>/', unified_execution_detail, name='unified_execution_detail'),
    
    # Generic automation endpoint for intelligent routing
    path('automation/generic/', generic_automation_execute, name='generic_automation_execute'),
    path('automation/mappings/', device_playbook_mappings, name='device_playbook_mappings'),
    path('automation/mappings/<uuid:mapping_id>/', device_playbook_mappings, name='device_playbook_mapping_detail'),
    
    # Webhook endpoints
    path('webhooks/',
         api_views.webhook_list,
         name='webhook_list'),
    path('webhooks/create/',
         api_views.webhook_create,
         name='webhook_create'),
    path('webhooks/<str:webhook_id>/',
         api_views.webhook_detail,
         name='webhook_detail'),
    path('webhooks/<str:webhook_id>/update/',
         api_views.webhook_update,
         name='webhook_update'),
    path('webhooks/<str:webhook_id>/delete/',
         api_views.webhook_delete,
         name='webhook_delete'),
    path('webhooks/<str:webhook_id>/test/',
         api_views.webhook_test,
         name='webhook_test'),
    
    # Include router URLs - LAST so it doesn't override custom routes
    path('', include(router.urls)),
    
    # Celery health check endpoint
    path('health/celery/', celery_health_check, name='celery_health_check'),
]
