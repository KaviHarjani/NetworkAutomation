#!/usr/bin/env python3
"""
Test script for the updated Ansible Device API with playbook_id
"""
import requests
import json
import uuid

# Configuration
API_URL = "http://localhost:8000/api/automation/ansible/execute-on-device/"
TEST_DEVICE_ID = "123e4567-e89b-12d3-a456-426614174000"  # Replace with actual device ID
TEST_PLAYBOOK_ID = "456e7890-e89b-12d3-a456-426614174001"  # Replace with actual playbook ID

def test_api_with_playbook_id():
    """Test the API with the new playbook_id format"""
    
    print("Testing Updated Ansible Device API")
    print("=" * 50)
    
    # Test data
    test_cases = [
        {
            "name": "Basic Execution",
            "data": {
                "device_id": TEST_DEVICE_ID,
                "playbook_id": TEST_PLAYBOOK_ID,
                "variables": {"test_var": "test_value"}
            }
        },
        {
            "name": "With Custom Variables",
            "data": {
                "device_id": TEST_DEVICE_ID,
                "playbook_id": TEST_PLAYBOOK_ID,
                "variables": {
                    "interface_name": "GigabitEthernet0/1",
                    "vlan_id": "100",
                    "custom_setting": "production"
                }
            }
        },
        {
            "name": "With Tags",
            "data": {
                "device_id": TEST_DEVICE_ID,
                "playbook_id": TEST_PLAYBOOK_ID,
                "variables": {"test_mode": True},
                "tags": ["configuration", "testing"],
                "skip_tags": ["debug"]
            }
        },
        {
            "name": "Missing playbook_id (should fail)",
            "data": {
                "device_id": TEST_DEVICE_ID,
                "variables": {"test_var": "test_value"}
            },
            "should_fail": True
        },
        {
            "name": "Invalid playbook_id (should fail)",
            "data": {
                "device_id": TEST_DEVICE_ID,
                "playbook_id": "invalid-uuid",
                "variables": {"test_var": "test_value"}
            },
            "should_fail": True
        }
    ]
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}:")
        print("-" * 30)
        
        try:
            response = requests.post(
                API_URL,
                json=test_case['data'],
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                
                # Check if test behaved as expected
                if test_case.get('should_fail', False):
                    if response.status_code >= 400:
                        print("✅ Expected failure - test passed")
                    else:
                        print("❌ Expected failure but got success - test failed")
                else:
                    if response.status_code < 400:
                        print("✅ Success - test passed")
                    else:
                        print("❌ Expected success but got failure - test failed")
            else:
                print(f"Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
    
    print("\n" + "=" * 50)
    print("API Test Complete")
    print("\nNote: Replace TEST_DEVICE_ID and TEST_PLAYBOOK_ID with actual IDs")
    print("from your database for full testing.")

def test_documentation_examples():
    """Test the examples from the documentation"""
    
    print("\n\nTesting Documentation Examples")
    print("=" * 50)
    
    # Example from documentation
    example_data = {
        "device_id": "123e4567-e89b-12d3-a456-426614174000",
        "playbook_id": "456e7890-e89b-12d3-a456-426614174001",
        "variables": {
            "interface_name": "GigabitEthernet0/1",
            "vlan_id": "100",
            "custom_setting": "production"
        }
    }
    
    print("Documentation Example:")
    print(f"Data: {json.dumps(example_data, indent=2)}")
    
    try:
        response = requests.post(
            API_URL,
            json=example_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("Ansible Device API Testing Script")
    print("=================================")
    print("\nThis script tests the updated API that uses playbook_id instead of playbook_content")
    print("\nMake sure:")
    print("1. Django server is running on localhost:8000")
    print("2. You have created test devices and playbooks in the database")
    print("3. Replace the TEST_DEVICE_ID and TEST_PLAYBOOK_ID variables with actual IDs")
    
    test_api_with_playbook_id()
    test_documentation_examples()