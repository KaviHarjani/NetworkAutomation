#!/usr/bin/env python3
"""
Test script for the new Ansible device-specific execution API endpoint.

This script demonstrates how to use the new /api/automation/ansible/execute-on-device/
endpoint to execute Ansible playbooks programmatically on specific devices.
"""

import json
import requests
import uuid
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_ENDPOINT = f"{BASE_URL}/api/automation/ansible/execute-on-device/"

# Sample Ansible playbook content for testing
SAMPLE_PLAYBOOK = """---
- name: Network Device Configuration Check
  hosts: network_devices
  gather_facts: no
  vars:
    test_interface: "{{ interface_name | default('GigabitEthernet0/1') }}"
    expected_vlan: "{{ vlan_id | default('100') }}"
  tasks:
    - name: Display device information
      debug:
        msg: |
          Device: {{ device_name }}
          IP Address: {{ device_ip }}
          Type: {{ device_type }}
          Vendor: {{ device_vendor }}
    
    - name: Show interface configuration
      debug:
        msg: |
          Testing interface: {{ test_interface }}
          Expected VLAN: {{ expected_vlan }}
    
    - name: Display custom variables
      debug:
        msg: |
          Custom Variable 1: {{ custom_var_1 | default('not_set') }}
          Custom Variable 2: {{ custom_var_2 | default('not_set') }}
"""

# Sample request payload templates
def create_device_execution_request(device_id, custom_vars=None, tags=None, skip_tags=None):
    """Create a request payload for device-specific execution"""
    
    # Default custom variables
    default_vars = {
        "interface_name": "GigabitEthernet0/1",
        "vlan_id": "100",
        "custom_var_1": "Test Value 1",
        "custom_var_2": "Test Value 2"
    }
    
    # Merge with custom variables if provided
    final_vars = {**default_vars, **(custom_vars or {})}
    
    payload = {
        "device_id": device_id,
        "playbook_content": SAMPLE_PLAYBOOK,
        "variables": final_vars
    }
    
    # Add optional fields if provided
    if tags:
        payload["tags"] = tags
    if skip_tags:
        payload["skip_tags"] = skip_tags
    
    return payload

def test_api_endpoint():
    """Test the new API endpoint"""
    print("🚀 Testing Ansible Device-Specific Execution API")
    print("=" * 60)
    
    # Test data
    test_device_id = str(uuid.uuid4())  # This should be replaced with a real device ID
    
    # Test 1: Basic execution with default variables
    print("\n📋 Test 1: Basic execution with default variables")
    print("-" * 50)
    
    payload1 = create_device_execution_request(test_device_id)
    
    try:
        response = requests.post(
            API_ENDPOINT,
            json=payload1,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! Execution completed:")
            print(json.dumps(result, indent=2))
        else:
            print("❌ Error response:")
            print(f"Status: {response.status_code}")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    # Test 2: Execution with custom variables
    print("\n📋 Test 2: Execution with custom variables")
    print("-" * 50)
    
    custom_vars = {
        "interface_name": "TenGigabitEthernet1/0/1",
        "vlan_id": "200",
        "custom_var_1": "Custom Network Config",
        "custom_var_2": "Production Setting"
    }
    
    payload2 = create_device_execution_request(test_device_id, custom_vars=custom_vars)
    
    try:
        response = requests.post(
            API_ENDPOINT,
            json=payload2,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! Execution with custom variables completed:")
            print(json.dumps(result, indent=2))
        else:
            print("❌ Error response:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    # Test 3: Execution with tags
    print("\n📋 Test 3: Execution with tags")
    print("-" * 50)
    
    payload3 = create_device_execution_request(
        test_device_id, 
        tags=["configuration", "testing"]
    )
    
    try:
        response = requests.post(
            API_ENDPOINT,
            json=payload3,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! Execution with tags completed:")
            print(json.dumps(result, indent=2))
        else:
            print("❌ Error response:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

def test_error_cases():
    """Test error handling scenarios"""
    print("\n🚨 Testing Error Handling")
    print("=" * 60)
    
    # Test 1: Missing device_id
    print("\n📋 Test: Missing device_id")
    print("-" * 30)
    
    payload_missing_device = {
        "playbook_content": SAMPLE_PLAYBOOK,
        "variables": {"test_var": "test_value"}
    }
    
    try:
        response = requests.post(
            API_ENDPOINT,
            json=payload_missing_device,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 400:
            error_data = response.json()
            print("✅ Correctly caught missing device_id error:")
            print(json.dumps(error_data, indent=2))
        else:
            print("❌ Unexpected response")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    # Test 2: Invalid device_id
    print("\n📋 Test: Invalid device_id")
    print("-" * 30)
    
    payload_invalid_device = {
        "device_id": "invalid-uuid-format",
        "playbook_content": SAMPLE_PLAYBOOK,
        "variables": {}
    }
    
    try:
        response = requests.post(
            API_ENDPOINT,
            json=payload_invalid_device,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 404:
            error_data = response.json()
            print("✅ Correctly caught invalid device_id error:")
            print(json.dumps(error_data, indent=2))
        else:
            print("❌ Unexpected response")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

def display_api_documentation():
    """Display comprehensive API documentation"""
    print("\n📚 API Documentation: Ansible Device-Specific Execution")
    print("=" * 70)
    
    doc = """
🔗 Endpoint: POST /api/automation/ansible/execute-on-device/

📝 Description:
    Execute Ansible playbooks programmatically on specific network devices.
    This endpoint accepts device information, YAML playbook content, and JSON variables
    to perform automated configuration and management tasks.

🔐 Authentication:
    CSRF exempt (no authentication required for this endpoint)

🌐 CORS:
    Enabled for cross-origin requests

📤 Request Format:
    Content-Type: application/json

    {
        "device_id": "uuid-string",           # Required: Device UUID from database
        "playbook_content": "yaml-string",    # Required: Ansible playbook YAML content
        "variables": {},                      # Optional: JSON object with variables
        "tags": [],                          # Optional: List of tags to run
        "skip_tags": []                      # Optional: List of tags to skip
    }

📥 Response Format:
    Content-Type: application/json

    Success Response (200):
    {
        "success": true,
        "execution_time": 12.5,
        "return_code": 0,
        "device_info": {
            "name": "Router-01",
            "hostname": "router01.example.com",
            "ip_address": "192.168.1.1",
            "device_type": "router",
            "vendor": "Cisco"
        },
        "playbook_info": {
            "valid": true,
            "plays": 1
        },
        "variables_used": {
            "device_name": "Router-01",
            "device_hostname": "router01.example.com",
            "device_ip": "192.168.1.1",
            "device_type": "router",
            "device_vendor": "Cisco",
            "custom_var_1": "Test Value 1"
        },
        "result": "ansible-playbook output...",
        "stdout": "execution output...",
        "stderr": ""
    }

    Error Response (400/404):
    {
        "success": false,
        "error": "Error description",
        "validation_error": "Validation details if applicable"
    }

🔧 Available Variables:
    The following variables are automatically available in all playbooks:
    - device_name: Name of the target device
    - device_hostname: Hostname of the device
    - device_ip: IP address of the device
    - device_type: Type of device (router, switch, etc.)
    - device_vendor: Device vendor information

    Plus any custom variables provided in the request.

📋 Example Usage:

    # Basic execution
    curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
         -H "Content-Type: application/json" \\
         -d '{
           "device_id": "123e4567-e89b-12d3-a456-426614174000",
           "playbook_content": "---\\n- name: Test\\n  hosts: all\\n  tasks:\\n    - debug:\\n        msg: Hello",
           "variables": {"custom_var": "value"}
         }'

    # With tags
    curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
         -H "Content-Type: application/json" \\
         -d '{
           "device_id": "123e4567-e89b-12d3-a456-426614174000",
           "playbook_content": "---\\n- name: Test\\n  hosts: all\\n  tasks:\\n    - debug:\\n        msg: Hello",
           "variables": {"custom_var": "value"},
           "tags": ["configuration", "testing"]
         }'

⚠️  Notes:
    - The endpoint executes playbooks synchronously (not async)
    - Maximum execution timeout is 5 minutes
    - Device must exist in the database
    - Playbook is validated before execution
    - Inventory is automatically generated from device information
"""
    
    print(doc)

def main():
    """Main function"""
    print("🔧 Ansible Device-Specific Execution API Test Suite")
    print("=" * 70)
    print(f"🕒 Test started at: {datetime.now().isoformat()}")
    print(f"🌐 Target URL: {API_ENDPOINT}")
    
    # Display documentation
    display_api_documentation()
    
    # Run tests (commented out for safety since we don't have real devices)
    # print("\n🧪 Running API Tests...")
    # test_api_endpoint()
    # test_error_cases()
    
    print("\n✅ Test suite completed!")
    print("📝 Note: Tests are commented out to prevent errors without real device IDs")
    print("🔧 To run actual tests, uncomment the test functions and provide valid device IDs")

if __name__ == "__main__":
    main()