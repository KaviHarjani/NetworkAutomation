#!/usr/bin/env python3
"""
Test script for the generic automation endpoint.

This script demonstrates how to use the new intelligent routing system
that can automatically select the correct Ansible playbook based on device
metadata and workflow type.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/automation"

def test_generic_automation():
    """Test the generic automation endpoint"""
    
    print("=== Generic Automation Endpoint Test ===\\n")
    
    # Test 1: Device not found
    print("1. Testing device not found scenario...")
    response = requests.post(
        f"{BASE_URL}/generic/",
        json={
            "hostname": "non-existent-device",
            "workflow": "reboot",
            "params": {"delay": 300}
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\\n")
    
    # Test 2: No mapping found
    print("2. Testing no mapping found scenario...")
    response = requests.post(
        f"{BASE_URL}/generic/",
        json={
            "hostname": "sw-core-01",
            "workflow": "unknown_workflow",
            "params": {}
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\\n")
    
    # Test 3: Missing required parameters
    print("3. Testing missing required parameters...")
    response = requests.post(
        f"{BASE_URL}/generic/",
        json={
            "hostname": "sw-core-01",
            "workflow": "vlan_add",
            "params": {
                "vlan_name": "SALES"
                # Missing vlan_id and ports
            }
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\\n")
    
    # Test 4: Successful execution (this will depend on your test data)
    print("4. Testing successful execution...")
    response = requests.post(
        f"{BASE_URL}/generic/",
        json={
            "hostname": "sw-core-01",
            "workflow": "reboot",
            "params": {
                "delay": 300,
                "save_config": True
            }
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 202:
        result = response.json()
        print(f"Success! Execution started:")
        print(f"  Execution ID: {result['execution_id']}")
        print(f"  Task ID: {result['task_id']}")
        print(f"  Device: {result['device_info']['hostname']}")
        print(f"  Playbook: {result['playbook_info']['name']}")
        print(f"  Workflow: {result['workflow_type']}")
        print(f"  Mapping: {result['mapping_used']['name']}")
        print(f"  Variables: {result['variables_used']}")
    else:
        print(f"Response: {response.json()}")
    print()
    
    # Test 5: VLAN add workflow
    print("5. Testing VLAN add workflow...")
    response = requests.post(
        f"{BASE_URL}/generic/",
        json={
            "hostname": "sw-access-12",
            "workflow": "vlan_add",
            "params": {
                "vlan_id": 120,
                "vlan_name": "SALES",
                "ports": ["Gi1/0/10", "Gi1/0/11"]
            }
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 202:
        result = response.json()
        print(f"Success! VLAN add execution started:")
        print(f"  Execution ID: {result['execution_id']}")
        print(f"  Device: {result['device_info']['hostname']}")
        print(f"  VLAN ID: {result['variables_used'].get('vlan_id')}")
        print(f"  VLAN Name: {result['variables_used'].get('vlan_name')}")
    else:
        print(f"Response: {response.json()}")
    print()

def test_mappings_endpoint():
    """Test the device-playbook mappings endpoint"""
    
    print("=== Device-Playbook Mappings Test ===\\n")
    
    response = requests.get(f"{BASE_URL}/mappings/")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Found {result['total']} mappings:")
        for mapping in result['mappings']:
            print(f"  - {mapping['name']} ({mapping['workflow_type']})")
            print(f"    Vendor: {mapping['vendor'] or '*'}")
            print(f"    Model: {mapping['model'] or '*'}")
            print(f"    OS: {mapping['os_version'] or '*'}")
            print(f"    Playbook: {mapping['playbook_name']}")
            print(f"    Priority: {mapping['priority']}")
            print(f"    Active: {mapping['is_active']}")
            print()
    else:
        print(f"Response: {response.json()}")

def create_sample_data():
    """Create sample data for testing (requires Django shell)"""
    
    print("=== Sample Data Creation ===\\n")
    print("To create sample data, run these commands in Django shell:")
    print("""
from django.contrib.auth.models import User
from automation.models import Device, AnsiblePlaybook, DevicePlaybookMapping

# Create a test user
user, created = User.objects.get_or_create(
    username='test_user',
    defaults={'email': 'test@example.com'}
)

# Create test devices
device1 = Device.objects.create(
    name="Core Switch 01",
    hostname="sw-core-01",
    ip_address="192.168.1.10",
    device_type="switch",
    vendor="Cisco",
    model="Catalyst 2960X",
    os_version="15.2(7)E10",
    created_by=user
)

device2 = Device.objects.create(
    name="Access Switch 12",
    hostname="sw-access-12",
    ip_address="192.168.1.12",
    device_type="switch",
    vendor="Cisco",
    model="Catalyst 2960X",
    os_version="15.2(7)E10",
    created_by=user
)

# Create test playbooks
reboot_playbook = AnsiblePlaybook.objects.create(
    name="Device Reboot Playbook",
    description="Playbook to reboot network devices",
    playbook_content='''
---
- name: Reboot Network Device
  hosts: network_devices
  gather_facts: no
  vars:
    reboot_delay: 300
    save_config: true
  
  tasks:
    - name: Save configuration
      ios_command:
        commands:
          - write memory
      when: save_config
    
    - name: Reboot device
      ios_command:
        commands:
          - reload
      args:
        confirm: yes
    ''',
    created_by=user
)

vlan_playbook = AnsiblePlaybook.objects.create(
    name="VLAN Management Playbook",
    description="Playbook to add/remove VLANs",
    playbook_content='''
---
- name: VLAN Management
  hosts: network_devices
  gather_facts: no
  vars:
    vlan_id: 100
    vlan_name: "TEST_VLAN"
    ports: []
  
  tasks:
    - name: Create VLAN
      ios_config:
        lines:
          - vlan {{ vlan_id }}
          - name {{ vlan_name }}
    
    - name: Add ports to VLAN
      ios_config:
        lines:
          - interface {{ item }}
          - switchport access vlan {{ vlan_id }}
      loop: "{{ ports }}"
      when: ports|length > 0
    ''',
    created_by=user
)

# Create mappings
mapping1 = DevicePlaybookMapping.objects.create(
    name="Cisco Switch Reboot",
    description="Reboot playbook for Cisco switches",
    vendor="Cisco",
    model="Catalyst 2960X",
    os_version="15.2(7)E10",
    device_type="switch",
    workflow_type="reboot",
    playbook=reboot_playbook,
    priority=100,
    is_active=True,
    default_variables='{"reboot_delay": 300, "save_config": true}',
    required_params='[]',
    created_by=user
)

mapping2 = DevicePlaybookMapping.objects.create(
    name="Cisco Switch VLAN Management",
    description="VLAN management for Cisco switches",
    vendor="Cisco",
    model="Catalyst 2960X",
    os_version="15.2(7)E10",
    device_type="switch",
    workflow_type="vlan_add",
    playbook=vlan_playbook,
    priority=100,
    is_active=True,
    default_variables='{}',
    required_params='["vlan_id", "vlan_name", "ports"]',
    created_by=user
)

# Alternatively, create mappings for specific devices
mapping3 = DevicePlaybookMapping.objects.create(
    name="Specific Device Reboot - Core Switch",
    description="Reboot playbook for core switch only",
    workflow_type="reboot",
    playbook=reboot_playbook,
    priority=200,  # Higher priority than metadata-based mappings
    is_active=True,
    default_variables='{"reboot_delay": 600}',  # Longer delay for core switch
    required_params='[]',
    created_by=user
)
# Add specific device to the mapping
mapping3.target_devices.add(device1)

print(f"Created devices: {device1.name}, {device2.name}")
print(f"Created playbooks: {reboot_playbook.name}, {vlan_playbook.name}")
print(f"Created mappings: {mapping1.name}, {mapping2.name}, {mapping3.name}")
""")

def main():
    """Main function"""
    print("Generic Automation Endpoint Test Suite")
    print("=" * 50)
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--create-data":
        create_sample_data()
        return
    
    try:
        test_mappings_endpoint()
        test_generic_automation()
        
        print("=== Test Complete ===")
        print("To create sample test data, run:")
        print("python test_generic_automation.py --create-data")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API server.")
        print("Make sure the Django development server is running:")
        print("python manage.py runserver")
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    main()