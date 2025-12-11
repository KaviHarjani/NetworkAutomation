from django.urls import path
from . import views

app_name = 'automation'

urlpatterns = [
    # React app routes
    path('', views.react_app_view, name='home'),
    path('login/', views.react_app_view, name='login'),
    path('dashboard/', views.react_app_view, name='dashboard'),
    path('devices/', views.react_app_view, name='device_list'),
    path('devices/create/', views.react_app_view, name='create_device'),
    path('workflows/', views.react_app_view, name='workflow_list'),
    path('workflows/create/', views.react_app_view, name='create_workflow'),
    path('workflows/execute/', views.react_app_view, name='workflow_execute'),
    path('executions/', views.react_app_view, name='execution_list'),
    path('executions/<str:execution_id>/', views.react_app_view, name='execution_detail'),
    
    # Legacy Django template routes (can be removed after full migration)
    # path('', views.dashboard_view, name='dashboard'),
    # path('dashboard/', views.dashboard_view, name='dashboard'),
    # path('devices/', views.device_list_view, name='device_list'),
    # path('devices/create/', views.create_device_view, name='create_device'),
    # path('workflows/', views.workflow_list_view, name='workflow_list'),
    # path('workflows/create/', views.create_workflow_view, name='create_workflow'),
    # path('workflows/execute/', views.workflow_execute_view, name='workflow_execute'),
    # path('executions/', views.execution_list_view, name='execution_list'),
    # path('executions/<str:execution_id>/', views.execution_detail_view, name='execution_detail'),
]