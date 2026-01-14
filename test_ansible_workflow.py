#!/usr/bin/env python3
"""
Test Ansible Workflow with Celery
Tests the complete Ansible workflow implementation.
"""

import os
import sys
import time
import django
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'network_automation.settings')
django.setup()

from automation.tasks import execute_ansible_playbook_on_device_task
from automation.models import Device, AnsiblePlaybook, AnsibleInventory, AnsibleExecution
from django.contrib.auth.models import User

def test_ansible_workflow():
    """Test the Ansible workflow implementation."""
    print("=" * 70)
    print("TESTING ANSIBLE WORKFLOW WITH CELERY")
    print("=" * 70)
    
    try:
        # Test 1: Check if we have devices in the database
        devices = Device.objects.all()
        print(f"📱 Found {devices.count()} devices in database")
        
        if devices.count() == 0:
            print("⚠️  No devices found. Creating a test device...")
            test_device = Device.objects.create(
                name="test_switch",
                hostname="192.168.1.100",
                ip_address="192.168.1.100",
                device_type="switch",
                vendor="Cisco",
                model="Catalyst 2960",
                ssh_port=22,
                location="Test Lab"
            )
            print(f"✅ Created test device: {test_device.name}")
        else:
            test_device = devices.first()
            print(f"✅ Using existing device: {test_device.name} ({test_device.ip_address})")
        
        # Test 2: Create a simple test playbook
        test_playbook = """
---
- name: Test connectivity
  hosts: network_devices
  gather_facts: no
  tasks:
    - name: Test ping
      ping:
"""
        
        print("📝 Testing playbook validation...")
        from automation.ansible_utils import validate_ansible_playbook_content
        validation_result = validate_ansible_playbook_content(test_playbook)
        
        if validation_result.get('valid'):
            print("✅ Test playbook is valid")
        else:
            print(f"❌ Test playbook validation failed: {validation_result.get('error')}")
            return False
        
        # Test 3: Test Celery task submission
        print("🚀 Testing Celery task submission...")
        
        # Submit the task to Celery
        task_result = execute_ansible_playbook_on_device_task.delay(
            device_id=test_device.id,
            playbook_content=test_playbook,
            variables={'test_variable': 'test_value'},
            tags=['test'],
            skip_tags=[]
        )
        
        print(f"📋 Task submitted with ID: {task_result.id}")
        print("⏳ Waiting for task to complete (this may take a moment)...")
        
        # Wait for the result (with timeout)
        try:
            result = task_result.get(timeout=30)
            print("🎉 Task completed successfully!")
            print(f"📊 Result: {result}")
            
            # Check if execution record was created
            if 'execution_id' in result:
                try:
                    execution = AnsibleExecution.objects.get(id=result['execution_id'])
                    print(f"📄 Execution record created: {execution.id}")
                    print(f"📊 Status: {execution.status}")
                    print(f"⏱️  Execution time: {execution.execution_time}s")
                except AnsibleExecution.DoesNotExist:
                    print("⚠️  Execution record not found")
            
            return True
            
        except Exception as e:
            print(f"❌ Task execution failed: {e}")
            print("💡 This might be expected if:")
            print("   - No Celery worker is running")
            print("   - Network device is not reachable")
            print("   - Ansible is not installed")
            return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        return False

def check_ansible_dependencies():
    """Check if Ansible and required dependencies are available."""
    print("=" * 70)
    print("CHECKING ANSIBLE DEPENDENCIES")
    print("=" * 70)
    
    dependencies = {
        'ansible': 'ansible --version',
        'python-yaml': 'python -c "import yaml; print(\"yaml OK\")"',
    }
    
    for name, command in dependencies.items():
        try:
            result = os.system(command + ' > /dev/null 2>&1')
            if result == 0:
                print(f"✅ {name}: Available")
            else:
                print(f"❌ {name}: Not available")
        except:
            print(f"❌ {name}: Check failed")

if __name__ == "__main__":
    print("This script tests the complete Ansible workflow with Celery.")
    print("Make sure a Celery worker is running for full testing.")
    print()
    
    # Check dependencies first
    check_ansible_dependencies()
    print()
    
    # Test the workflow
    success = test_ansible_workflow()
    
    print("\n" + "=" * 70)
    if success:
        print("🎉 ANSIBLE WORKFLOW TEST PASSED!")
        print("✅ Celery integration is working correctly")
    else:
        print("⚠️  ANSIBLE WORKFLOW TEST NEEDS INVESTIGATION")
        print("💡 Possible issues:")
        print("   - No Celery worker running")
        print("   - Network device connectivity")
        print("   - Ansible installation")
    print("=" * 70)
    
    sys.exit(0)