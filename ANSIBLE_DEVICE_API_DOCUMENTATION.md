# Ansible Device-Specific Execution API Feature

## Overview

This document describes the new feature that enables programmatic execution of Ansible workflows via API with device-specific targeting. Users can now send device ID and playbook ID to execute stored Ansible playbooks on specific network devices through a RESTful API.

## New API Endpoint

### Endpoint: `POST /api/automation/ansible/execute-on-device/`

This endpoint allows users to execute Ansible playbooks programmatically on specific devices by providing:
- Device ID from the database
- Playbook ID from the database (YAML content is stored on backend)
- JSON variables for playbook execution
- Optional tags and skip_tags

## Implementation Details

### Files Modified/Created

1. **`automation/ansible_utils.py`** - Enhanced with new utility functions:
   - `generate_device_inventory(device, group_name="network_devices")` - Generates Ansible inventory from device information
   - `execute_ansible_playbook_on_device(device, playbook_content, variables=None, tags=None, skip_tags=None)` - Executes playbook on specific device

2. **`automation/csrf_exempt_views.py`** - Added new view function:
   - `ansible_playbook_execute_on_device(request)` - Main API endpoint handler

3. **`automation/api_urls.py`** - Added new URL pattern:
   - `path('ansible/execute-on-device/', csrf_exempt_views.ansible_playbook_execute_on_device, name='ansible_playbook_execute_on_device')`

4. **`test_ansible_device_api.py`** - Created comprehensive test script with documentation

## API Request Format

```json
{
    "device_id": "uuid-string",           // Required: Device UUID from database
    "playbook_id": "uuid-string",         // Optional: Ansible playbook UUID from database
    "playbook_name": "string",            // Optional: Ansible playbook name from database
    "variables": {},                      // Optional: JSON object with variables
    "tags": [],                          // Optional: List of tags to run
    "skip_tags": []                      // Optional: List of tags to skip
}
```

**Note:** Provide either `playbook_id` OR `playbook_name`, not both.

## API Response Format

### Success Response (200)
```json
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
```

### Error Response (400/404)
```json
{
    "success": false,
    "error": "Error description",
    "validation_error": "Validation details if applicable"
}
```

## Usage Examples

### Using Playbook ID (Recommended)
```bash
curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_id": "456e7890-e89b-12d3-a456-426614174001",
       "variables": {"custom_var": "value"}
     }'
```

### Using Playbook Name
```bash
curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_name": "network-config-playbook",
       "variables": {"custom_var": "value"}
     }'
```

### With Custom Variables
```bash
curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_name": "interface-configuration",
       "variables": {
         "interface_name": "GigabitEthernet0/1",
         "vlan_id": "100",
         "custom_setting": "production"
       }
     }'
```

### With Tags
```bash
curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_id": "456e7890-e89b-12d3-a456-426614174001",
       "variables": {"test_mode": true},
       "tags": ["configuration", "testing"]
     }'
```

## Automatic Variables

The following variables are automatically available in all playbooks executed through this endpoint:

- `device_name`: Name of the target device
- `device_hostname`: Hostname of the device  
- `device_ip`: IP address of the device
- `device device (router,_type`: Type of switch, etc.)
- `device_vendor`: Device vendor information

Plus any custom variables provided in the request.

## Generated Inventory

The system automatically generates an Ansible inventory file for the target device with the following structure:

```ini
[network_devices]
router01 ansible_host=192.168.1.1 ansible_port=22

[network_devices:vars]
ansible_host=192.168.1.1
ansible_port=22
device_type=router
device_vendor=Cisco
device_model=ISR4331
device_name=Router-01
location=Data Center A
```

## Features

### 1. Device-Specific Targeting
- Executes playbooks on specific devices using device ID from database
- Automatically generates inventory based on device information
- Provides device context in execution results

### 2. Dynamic Variable Support
- Accepts custom JSON variables that override defaults
- Automatic device information variables
- Support for tags and skip_tags

### 3. Validation & Error Handling
- Validates playbook syntax before execution
- Checks device existence in database
- Comprehensive error messages for troubleshooting

### 4. CORS Support
- CSRF exempt for easy integration
- CORS headers enabled for cross-origin requests
- Suitable for frontend applications

### 5. Synchronous Execution
- Executes playbooks synchronously (not async)
- Returns complete execution results
- Maximum timeout: 5 minutes

## Error Handling

The API provides detailed error messages for common scenarios:

- **Missing device_id**: Returns 400 Bad Request
- **Invalid device_id**: Returns 404 Not Found
- **Missing playbook_id and playbook_name**: Returns 400 Bad Request
- **Both playbook_id and playbook_name provided**: Returns 400 Bad Request
- **Invalid playbook_id**: Returns 404 Not Found
- **Invalid playbook_name**: Returns 404 Not Found
- **Invalid variables format**: Returns 400 with format error
- **Execution timeout**: Returns error after 5 minutes
- **Device connection issues**: Returns execution failure details

## Security Considerations

- CSRF exempt endpoint (suitable for API usage)
- No authentication required (consider adding auth in production)
- Validates all input parameters
- Safe handling of device information
- No exposure of sensitive device credentials

## Testing

Use the provided test script `test_ansible_device_api.py` to:
- Test the API endpoint functionality
- Validate request/response formats
- Test error handling scenarios
- Generate usage documentation

## Integration Notes

This feature integrates seamlessly with the existing Ansible infrastructure:
- Uses existing Ansible models and utilities
- Leverages current validation and execution mechanisms
- Compatible with existing workflow system
- Maintains consistent API patterns

## Future Enhancements

Potential improvements for future versions:
- Add authentication/authorization
- Implement async execution with task tracking
- Add support for multiple devices
- Include playbook result caching
- Add execution history tracking
- Implement webhook notifications for completion

## Support

For issues or questions about this feature:
1. Check the test script output for examples
2. Review error messages in API responses
3. Validate device exists in database
4. Ensure playbook syntax is correct
5. Check network connectivity to target devices