#!/usr/bin/env python
"""
Test script to verify Celery with SQLite configuration
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.insert(0, '/Users/admin/Desktop/projects/networkautomation')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'network_automation.settings')
django.setup()

from celery import Celery
from automation.tasks import *  # Import your tasks
import time

def test_celery_config():
    """Test Celery configuration"""
    from network_automation.celery import app
    
    print("=== Celery Configuration Test ===")
    print(f"Broker URL: {app.conf.broker_url}")
    print(f"Result Backend: {app.conf.result_backend}")
    print(f"Task Serializer: {app.conf.task_serializer}")
    print(f"Result Serializer: {app.conf.result_serializer}")
    print(f"Timezone: {app.conf.timezone}")
    
    # Test if broker is accessible
    try:
        inspector = app.control.inspect()
        print(f"Active queues: {inspector.active_queues()}")
    except Exception as e:
        print(f"Inspector error: {e}")
    
    print("\n=== Testing Task Registration ===")
    registered_tasks = app.tasks.keys()
    print(f"Registered tasks: {list(registered_tasks)}")
    
    print("\n=== Testing Database Files ===")
    import os
    broker_db = "celery_broker.sqlite3"
    result_db = "celery_results.sqlite3"
    
    print(f"Broker DB exists: {os.path.exists(broker_db)}")
    print(f"Result DB exists: {os.path.exists(result_db)}")
    
    if not os.path.exists(broker_db):
        print("Creating broker database...")
        # This will create the broker database when first used
        
    if not os.path.exists(result_db):
        print("Creating result database...")
        # This will create the result database when first used

def test_simple_task():
    """Test a simple Celery task"""
    from network_automation.celery import app
    
    print("\n=== Testing Cleanup Task ===")
    try:
        # Test the cleanup_old_executions task (no parameters needed)
        result = app.send_task('automation.tasks.cleanup_old_executions')
        print(f"Task sent: {result.id}")
        
        # Wait for result (with timeout)
        try:
            task_result = result.get(timeout=10)
            print(f"Task result: {task_result}")
        except Exception as e:
            print(f"Task execution error: {e}")
            
    except Exception as e:
        print(f"Error sending task: {e}")

if __name__ == "__main__":
    test_celery_config()
    test_simple_task()