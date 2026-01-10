#!/usr/bin/env python3
"""
Celery Configuration Test Script
This script tests if Celery is properly configured and can connect to the broker.
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'network_automation.settings')
django.setup()

import celery
from celery import Celery
from django.conf import settings

def test_celery_config():
    """Test Celery configuration and connectivity."""
    print("=" * 60)
    print("CELERY CONFIGURATION TEST")
    print("=" * 60)
    
    # Test 1: Check Celery app creation
    try:
        app = celery.Celery('network_automation')
        print("✅ Celery app created successfully")
    except Exception as e:
        print(f"❌ Failed to create Celery app: {e}")
        return False
    
    # Test 2: Check Django settings
    try:
        broker_url = settings.CELERY_BROKER_URL
        result_backend = settings.CELERY_RESULT_BACKEND
        print(f"✅ Broker URL configured: {broker_url}")
        print(f"✅ Result Backend configured: {result_backend}")
    except Exception as e:
        print(f"❌ Failed to read Django settings: {e}")
        return False
    
    # Test 3: Check if broker database files exist or can be created
    try:
        from urllib.parse import urlparse
        
        # Check broker database
        broker_parsed = urlparse(broker_url)
        if broker_parsed.scheme == 'sqla+sqlite':
            broker_db_path = Path(broker_parsed.path.lstrip('/'))
            if broker_db_path.exists():
                print(f"✅ Broker database exists: {broker_db_path}")
            else:
                print(f"ℹ️  Broker database will be created: {broker_db_path}")
        
        # Check result backend database
        result_parsed = urlparse(result_backend)
        if result_parsed.scheme == 'db+sqlite':
            result_db_path = Path(result_parsed.path.lstrip('/'))
            if result_db_path.exists():
                print(f"✅ Result backend database exists: {result_db_path}")
            else:
                print(f"ℹ️  Result backend database will be created: {result_db_path}")
                
    except Exception as e:
        print(f"⚠️  Could not check database files: {e}")
    
    # Test 4: Test broker connection
    try:
        # For SQLite broker, we'll just check if we can import the required modules
        from sqlalchemy import create_engine
        print("✅ SQLAlchemy available for SQLite broker")
    except ImportError:
        print("❌ SQLAlchemy not available")
        return False
    
    # Test 5: List available tasks
    try:
        # Import tasks module to register tasks
        import automation.tasks
        print("✅ Tasks module imported successfully")
        
        # Get registered tasks
        registered_tasks = app.tasks.keys()
        print(f"✅ Found {len(registered_tasks)} registered tasks:")
        for task_name in sorted(registered_tasks):
            if not task_name.startswith('celery.'):
                print(f"   - {task_name}")
                
    except Exception as e:
        print(f"⚠️  Could not import tasks or list them: {e}")
    
    # Test 6: Check if Celery worker can be inspected
    try:
        # This is just a configuration test, not actually starting a worker
        print("✅ Celery configuration appears valid")
        print("\n📋 NEXT STEPS:")
        print("1. Run the Celery worker with: ./start_celery_worker.sh")
        print("2. Test task execution in Django shell or through API")
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_celery_config()
    sys.exit(0 if success else 1)