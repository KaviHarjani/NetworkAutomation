# Generic Automation Endpoint Documentation

## Overview

The Generic Automation Endpoint provides a single, intelligent API that can automatically route automation requests to the correct Ansible playbook based on device metadata (model, OS, version) and workflow type. This eliminates the need for callers to know which specific playbook to use for each device.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Request   │    │  Device Lookup   │    │ Exact Match     │
│                 │    │                  │    │ Search          │
│ {               │───▶│ hostname:        │───▶│ workflow_type:  │
│   hostname:     │    │ sw-core-01       │    │ reboot          │
│   workflow:     │    │                  │    │ vendor/model/   │
│   params: {}    │    │                  │    │ os_version      │
│ }               │    │                  │    │ exact match     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Execution      │    │  Ansible         │    │  Response       │
│  Response       │    │  Execution       │    │                 │
│                 │    │                  │    │                 │
│ {               │◀───│ playbook:        │◀───│ execution_id:   │
│   execution_id  │    │ reboot_cisco     │    │ task_id:        │
│   task_id:      │    │                  │    │ device_info:    │
│   device_info:  │    │ variables:       │    │ playbook_info:  │
│ }               │    │ {device_info}    │    │ }               │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Components

### 1. DevicePlaybookMapping Model

The core of the intelligent routing system is the `DevicePlaybookMapping` model that stores:

- **Target Devices**: Many-to-many relationship with specific Device instances (preferred approach)
- **Device Metadata Filters**: vendor, model, os_version, device_type (used when no specific devices are selected)
- **Workflow Type**: The type of workflow (e.g., 'reboot', 'vlan_add', 'backup')
- **Playbook Reference**: Link to the AnsiblePlaybook to execute
- **Matching Logic**: Specific devices take priority, then exact match on metadata
- **Priority**: Higher priority mappings are evaluated first
- **Variables**: Default variables and required parameters

**Recommendation**: Use `target_devices` field for specific device targeting. Use metadata filters for device types/groups.

### 2. Generic Automation Endpoint

**Endpoint**: `POST /api/automation/generic/`

**Request Format**:
```json
{
    "hostname": "sw-core-01",
    "workflow": "reboot",
    "params": {
        "delay": 300,
        "save_config": true
    }
}
```

**Response Format**:
```json
{
    "execution_id": "uuid-here",
    "task_id": "celery-task-id",
    "message": "Generic automation execution started successfully",
    "device_info": {
        "hostname": "sw-core-01",
        "name": "Core Switch 01",
        "ip_address": "192.168.1.10",
        "device_type": "switch",
        "vendor": "Cisco",
        "model": "Catalyst 2960X",
        "os_version": "15.2(7)E10"
    },
    "playbook_info": {
        "id": "playbook-uuid",
        "name": "Device Reboot Playbook",
        "description": "Playbook to reboot network devices"
    },
    "workflow_type": "reboot",
    "mapping_used": {
        "id": "mapping-uuid",
        "name": "Cisco Switch Reboot",
        "mapping_type": "exact",
        "priority": 100
    },
    "variables_used": {
        "device_name": "Core Switch 01",
        "device_hostname": "sw-core-01",
        "device_ip": "192.168.1.10",
        "device_type": "switch",
        "device_vendor": "Cisco",
        "device_model": "Catalyst 2960X",
        "workflow_type": "reboot",
        "delay": 300,
        "save_config": true
    }
}
```

## Usage Examples

### Example 1: Device Reboot

```bash
curl -X POST http://localhost:8000/api/automation/generic/ \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"hostname\": \"sw-core-01\",
    \"workflow\": \"reboot\",
    \"params\": {
      \"delay\": 300,
      \"save_config\": true
    }
  }'
```

### Example 2: VLAN Addition

```bash
curl -X POST http://localhost:8000/api/automation/generic/ \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"hostname\": \"sw-access-12\",
    \"workflow\": \"vlan_add\",
    \"params\": {
      \"vlan_id\": 120,
      \"vlan_name\": \"SALES\",
      \"ports\": [\"Gi1/0/10\", \"Gi1/0/11\"]
    }
  }'
```

### Example 3: Configuration Backup

```bash
curl -X POST http://localhost:8000/api/automation/generic/ \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"hostname\": \"fw-main-01\",
    \"workflow\": \"backup\",
    \"params\": {
      \"backup_location\": \"/backup\",
      \"compress\": true
    }
  }'
```

## Setting Up Device-Playbook Mappings

### Via Django Admin

1. Navigate to Django Admin: `/admin/`
2. Go to **Automation** > **Device Playbook Mappings**
3. Click **Add Device Playbook Mapping**

### Via API

```bash
# Get existing mappings
curl http://localhost:8000/api/automation/mappings/

# Create new mapping (via Django admin or custom endpoint)
```

### Mapping Configuration

#### Recommended: Targeting Specific Devices
```python
# Create mapping for specific devices (highest priority)
mapping = DevicePlaybookMapping.objects.create(
    name="Critical Infrastructure Reboot",
    description="Special reboot handling for core infrastructure",
    workflow_type="reboot",
    playbook=reboot_playbook,
    priority=200,  # Higher than metadata-based mappings
    is_active=True,
    default_variables='{"reboot_delay": 600}',  # Longer delay for critical devices
    required_params='[]'
)
# Add specific devices to the mapping
mapping.target_devices.add(core_switch_1, core_router_1)
```

#### Alternative: Using Metadata Filters
```python
# Create mapping based on device metadata
mapping = DevicePlaybookMapping.objects.create(
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
    default_variables='{"reboot_delay": 300}',
    required_params='[]'
)
```

**Best Practice**: Use `target_devices` for specific device targeting and metadata filters for device groups/types. Specific device mappings have higher priority and take precedence over metadata-based mappings.

## Workflow Types

Common workflow types you might define:

- `reboot`: Device reboot operations
- `vlan_add`: Add VLANs to switches
- `vlan_remove`: Remove VLANs from switches
- `backup`: Configuration backup
- `restore`: Configuration restore
- `update`: Software/firmware update
- `security_audit`: Security compliance checks
- `performance_test`: Network performance testing

## Intelligent Routing Logic

The system uses a priority-based routing algorithm:

1. **Filter by workflow type**: Only consider mappings for the requested workflow
2. **Filter by active status**: Only consider active mappings
3. **Sort by priority**: Higher priority mappings are evaluated first
4. **Apply matching logic**: 
   - **Specific device targeting**: If mapping has target_devices, check if current device is in the list
   - **Metadata filtering**: If no specific devices, check exact match on vendor, model, os_version, device_type
5. **Validate parameters**: Ensure required parameters are provided
6. **Execute playbook**: Run the selected playbook with merged variables

**Priority Order**:
1. Highest priority mappings (specific devices + high priority number)
2. Medium priority mappings (metadata-based + high priority number)
3. Lower priority mappings (specific devices + low priority number)
4. Lowest priority mappings (metadata-based + low priority number)

## Variable Precedence

Variables are merged in this order (later overrides earlier):

1. **Mapping default variables**: Defined in the DevicePlaybookMapping
2. **Request parameters**: Provided in the API call
3. **System variables**: Automatically added by the system

System variables always include:
- `device_name`: Device name from database
- `device_hostname`: Device hostname
- `device_ip`: Device IP address
- `device_type`: Device type (router, switch, etc.)
- `device_vendor`: Device vendor
- `device_model`: Device model
- `workflow_type`: The requested workflow type

## Error Handling

### Device Not Found
```json
{
    \"error\": \"Device with hostname sw-core-01 not found\"
}
```

### No Mapping Found
```json
{
    \"error\": \"No active playbook mapping found for workflow type 'reboot' and device sw-core-01 (Cisco Catalyst 2960X 15.2(7)E10)\"
}
```

### Missing Required Parameters
```json
{
    \"error\": \"Missing required parameters: ['vlan_id', 'ports']\",
    \"required_params\": [\"vlan_id\", \"vlan_name\", \"ports\"]
}
```

### Invalid JSON
```json
{
    \"error\": \"Invalid JSON data\"
}
```

## Integration with Device Mapping UI

The existing Device Mapping UI can be extended to manage these mappings:

1. **Add "Playbook Mappings" tab** to the Device Mapping page
2. **Show current mappings** for each device group
3. **Allow creating/editing mappings** directly from the UI
4. **Test mappings** with sample API calls

## Best Practices

### 1. Use Specific Device Targeting for Critical Equipment
Create specific mappings for critical infrastructure devices with high priority (180-200).

### 2. Use Metadata Filters for Device Groups
Use metadata-based mappings for common device types with medium priority (80-120).

### 3. Set Appropriate Priorities
- Critical devices: 180-200
- Important devices: 120-179
- Standard devices: 80-119
- Fallback/default: 1-79

### 4. Validate Parameters
Always define required parameters in your mappings to catch configuration errors early.

### 5. Use Meaningful Names
Give your mappings descriptive names that indicate their purpose and scope.

### 6. Document Your Workflows
Include clear descriptions for each workflow type and mapping.

### 7. Test Your Mappings
Use the test script to verify your mappings work correctly.

### 8. Monitor Priority Conflicts
Ensure no two mappings have identical priority and targeting to avoid unpredictable behavior.

## Testing

Run the test script to verify your setup:

```bash
# Create sample data
python test_generic_automation.py --create-data

# Run tests
python test_generic_automation.py
```

## Security Considerations

1. **Authentication**: The endpoint should be protected with proper authentication
2. **Authorization**: Ensure users can only execute workflows on authorized devices
3. **Input Validation**: The system validates all input parameters
4. **Audit Logging**: All executions are logged for audit trails
5. **Rate Limiting**: Consider implementing rate limiting for the endpoint

## Monitoring and Debugging

### Check Execution Status
```bash
curl http://localhost:8000/api/ansible-executions/{execution_id}/
```

### View Logs
Check the execution logs in the Django admin or via the logs endpoint.

### Monitor Celery Tasks
Monitor Celery task status and results.

## Troubleshooting

### Common Issues

1. **Mapping not found**: Check that the mapping exists and is active
2. **Device not found**: Verify the hostname in the Device model
3. **Parameter validation failed**: Check required_params in the mapping
4. **Ansible execution failed**: Check playbook syntax and device connectivity

### Debug Steps

1. Verify device exists: `GET /api/devices/?search=hostname`
2. Check mappings: `GET /api/automation/mappings/`
3. Test mapping manually via Django shell
4. Check Ansible playbook syntax
5. Verify device connectivity and credentials

## Future Enhancements

Potential future improvements:

1. **UI Integration**: Full integration with the existing Device Mapping UI
2. **Workflow Templates**: Pre-defined workflow templates for common operations
3. **Scheduling**: Support for scheduled executions
4. **Approval Workflows**: Require approval for sensitive operations
5. **Bulk Operations**: Execute workflows on multiple devices
6. **Rollback Support**: Automatic rollback on failure
7. **Real-time Monitoring**: WebSocket updates for execution status
8. **Advanced Matching**: Machine learning-based device categorization