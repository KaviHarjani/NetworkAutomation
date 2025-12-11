from django.shortcuts import render
from django.http import HttpResponse
import os

def react_app_view(request):
    """Serve the React app"""
    # Get the path to the React build directory
    react_build_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'build')
    index_path = os.path.join(react_build_path, 'index.html')
    
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HttpResponse(content)
    except FileNotFoundError:
        # If React app hasn't been built yet, show a message
        return HttpResponse("""
        <html>
        <head><title>Network Automation</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Network Automation Tool</h1>
            <p>React app is not built yet. Please run:</p>
            <code>cd frontend && npm run build</code>
            <p>Then restart the Django server.</p>
        </body>
        </html>
        """)


def dashboard_view(request):
    """Dashboard view - redirects to React app"""
    return react_app_view(request)


def device_list_view(request):
    """Device list view - redirects to React app"""
    return react_app_view(request)


def workflow_list_view(request):
    """Workflow list view - redirects to React app"""
    return react_app_view(request)


def execution_list_view(request):
    """Execution list view - redirects to React app"""
    return react_app_view(request)


def create_device_view(request):
    """Create device view - redirects to React app"""
    return react_app_view(request)


def create_workflow_view(request):
    """Create workflow view - redirects to React app"""
    return react_app_view(request)


def workflow_execute_view(request):
    """Workflow execute view - redirects to React app"""
    return react_app_view(request)


def execution_detail_view(request, execution_id):
    """Execution detail view - redirects to React app"""
    return react_app_view(request)