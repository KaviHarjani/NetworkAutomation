"""
Ansible utilities for executing playbooks and managing inventory
"""
import os
import tempfile
import subprocess
import json
import yaml
import time
from datetime import datetime
from decouple import config
from .models import AnsibleExecution


class AnsibleRunner:
    """Class to execute Ansible playbooks using subprocess"""
    
    def execute_playbook(self, playbook_content, inventory_content, extra_vars=None,
                        tags=None, skip_tags=None, execution_id=None):
        """
        Execute an Ansible playbook using subprocess
        
        Args:
            playbook_content: YAML content of the playbook
            inventory_content: Inventory content (hosts file format)
            extra_vars: Dictionary of extra variables
            tags: List of tags to run
            skip_tags: List of tags to skip
            execution_id: Database execution ID for tracking
            
        Returns:
            dict: Execution results including stdout, stderr, and return code
        """
        start_time = datetime.now()
        
        try:
            # Create temporary files
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write playbook to temp file
                playbook_file = os.path.join(temp_dir, 'playbook.yml')
                with open(playbook_file, 'w') as f:
                    f.write(playbook_content)
                
                # Write inventory to temp file
                inventory_file = os.path.join(temp_dir, 'inventory')
                with open(inventory_file, 'w') as f:
                    f.write(inventory_content)
                
                # Build ansible-playbook command
                cmd = [
                    'ansible-playbook',
                    '-i', inventory_file,
                    playbook_file,
                    '--forks', '5',
                    '--timeout', '30',
                ]
                
                # Set up environment variables for Ansible network credentials
                env_vars = os.environ.copy()
                
                # Pass Ansible network credentials using python-decouple (same as Django settings)
                ansible_user = config('ANSIBLE_NET_USERNAME', default=None)
                ansible_password = config('ANSIBLE_NET_PASSWORD', default=None)
                ansible_auth_pass = config('ANSIBLE_NET_AUTH_PASS', default=None)
                
                if ansible_user and isinstance(ansible_user, str):
                    env_vars['ANSIBLE_NET_USERNAME'] = ansible_user
                if ansible_password and isinstance(ansible_password, str):
                    env_vars['ANSIBLE_NET_PASSWORD'] = ansible_password
                if ansible_auth_pass and isinstance(ansible_auth_pass, str):
                    env_vars['ANSIBLE_NET_AUTH_PASS'] = ansible_auth_pass
                
                # Add tags if specified
                if tags:
                    cmd.extend(['--tags', ','.join(tags)])
                
                # Add skip tags if specified
                if skip_tags:
                    cmd.extend(['--skip-tags', ','.join(skip_tags)])
                
                # Add extra vars if specified
                if extra_vars:
                    for key, value in extra_vars.items():
                        cmd.extend(['-e', f'{key}={value}'])
                
                # Execute command with environment variables
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minute timeout
                    env=env_vars  # Pass environment variables to Ansible
                )
                
                end_time = datetime.now()
                execution_time = (end_time - start_time).total_seconds()
                
                # Prepare results
                results = {
                    'stdout': result.stdout,
                    'stderr': result.stderr,
                    'return_code': result.returncode,
                    'execution_time': execution_time,
                    'start_time': start_time,
                    'end_time': end_time
                }
                
                # Update database with results
                if execution_id:
                    self._update_execution_results(execution_id, results)
                
                return results
                
        except subprocess.TimeoutExpired:
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            results = {
                'stdout': '',
                'stderr': 'Ansible playbook execution timed out after 5 minutes',
                'return_code': 124,  # Timeout exit code
                'execution_time': execution_time,
                'start_time': start_time,
                'end_time': end_time
            }
            
            if execution_id:
                self._update_execution_results(execution_id, results)
            
            return results
            
        except Exception as e:
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            results = {
                'stdout': '',
                'stderr': f'Execution failed: {str(e)}',
                'return_code': 1,
                'execution_time': execution_time,
                'start_time': start_time,
                'end_time': end_time
            }
            
            if execution_id:
                self._update_execution_results(execution_id, results)
            
            return results
    
    def _update_execution_results(self, execution_id, results):
        """Update execution results in database"""
        try:
            execution = AnsibleExecution.objects.get(id=execution_id)
            execution.stdout = results['stdout']
            execution.stderr = results['stderr']
            execution.return_code = results['return_code']
            execution.execution_time = results.get('execution_time', 0)
            execution.completed_at = datetime.now()
            
            # Update status based on return code
            if results['return_code'] == 0:
                execution.status = 'completed'
            else:
                execution.status = 'failed'
            
            execution.save()
            
        except AnsibleExecution.DoesNotExist:
            pass  # Execution record not found
        except Exception:
            pass  # Silently handle database errors
    
    def validate_playbook(self, playbook_content):
        """
        Validate Ansible playbook syntax
        
        Args:
            playbook_content: YAML content of the playbook
            
        Returns:
            dict: Validation results
        """
        try:
            # Try to parse as YAML
            playbook_data = yaml.safe_load(playbook_content)
            
            if not playbook_data:
                return {
                    'valid': False,
                    'error': 'Empty playbook content'
                }
            
            # Basic validation
            if not isinstance(playbook_data, list):
                playbook_data = [playbook_data]
            
            for play in playbook_data:
                if not isinstance(play, dict):
                    return {
                        'valid': False,
                        'error': 'Play must be a dictionary'
                    }
                
                if 'hosts' not in play:
                    return {
                        'valid': False,
                        'error': 'Play must specify hosts'
                    }
                
                if 'tasks' not in play:
                    return {
                        'valid': False,
                        'error': 'Play must specify tasks'
                    }
            
            return {
                'valid': True,
                'plays': len(playbook_data)
            }
            
        except yaml.YAMLError as e:
            return {
                'valid': False,
                'error': f'YAML syntax error: {str(e)}'
            }
        except Exception as e:
            return {
                'valid': False,
                'error': f'Validation error: {str(e)}'
            }
    
    def validate_inventory(self, inventory_content):
        """
        Validate Ansible inventory syntax
        
        Args:
            inventory_content: Inventory content
            
        Returns:
            dict: Validation results
        """
        try:
            # Try to parse as YAML first
            try:
                inventory_data = yaml.safe_load(inventory_content)
                if isinstance(inventory_data, dict):
                    return {
                        'valid': True,
                        'groups': len(inventory_data),
                        'format': 'yaml'
                    }
            except yaml.YAMLError:
                pass  # Not YAML, try as INI
            
            # Try as INI format (basic check)
            lines = inventory_content.strip().split('\n')
            host_count = 0
            group_count = 0
            
            in_group = False
            current_group = None
            
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                # Check for group headers
                if line.startswith('[') and line.endswith(']'):
                    in_group = True
                    current_group = line[1:-1]
                    group_count += 1
                    continue
                
                # Check for host entries
                if '=' in line:
                    # Host with variables
                    host = line.split('=')[0].strip()
                    if host and host not in ['[', ']']:
                        host_count += 1
                elif ':' in line:
                    # Host with port
                    host = line.split(':')[0].strip()
                    if host and host not in ['[', ']']:
                        host_count += 1
                else:
                    # Simple host entry
                    if line not in ['[', ']']:
                        host_count += 1
            
            return {
                'valid': True,
                'hosts': host_count,
                'groups': group_count,
                'format': 'ini'
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': f'Inventory validation error: {str(e)}'
            }



def execute_ansible_playbook_on_device_task(
    device_id, playbook_content, variables=None, tags=None, skip_tags=None
):
    """
    Celery task to execute Ansible playbook on a device in background
    
    Args:
        device_id: Device ID
        playbook_content: YAML content of the Ansible playbook
        variables: Dictionary of extra variables (optional)
        tags: List of tags to run (optional)
        skip_tags: List of tags to skip (optional)
        
    Returns:
        dict: Execution results
    """
    from .models import Device, AnsibleExecution, AnsiblePlaybook, AnsibleInventory
    from .webhook_utils import WebhookManager
    from django.contrib.auth.models import User
    
    try:
        # Get device from database
        device = Device.objects.get(id=device_id)
        
        # Create temporary playbook and inventory for execution tracking
        # For direct device execution, we'll create minimal records
        temp_playbook = type('TempPlaybook', (), {
            'name': f'Device_{device.name}_Playbook',
            'playbook_content': playbook_content
        })()
        
        temp_inventory = type('TempInventory', (), {
            'name': f'Device_{device.name}_Inventory',
            'inventory_content': generate_device_inventory(device)
        })()
        
        # Create AnsibleExecution record
        execution_record = AnsibleExecution.objects.create(
            playbook=type('PlaybookRef', (), {'id': None})(),  # Temporary reference
            inventory=type('InventoryRef', (), {'id': None})(),  # Temporary reference
            status='running',
            started_at=datetime.now()
        )
        
        # Send webhook for execution started
        WebhookManager.send_ansible_webhook_notification(
            execution_record, 'ansible_execution_started'
        )
        
        # Execute playbook using the existing function
        result = execute_ansible_playbook_on_device(
            device=device,
            playbook_content=playbook_content,
            variables=variables,
            tags=tags,
            skip_tags=skip_tags
        )
        
        # Update execution record with results
        execution_record.status = 'completed' if result.get('success') else 'failed'
        execution_record.completed_at = datetime.now()
        execution_record.execution_time = result.get('execution_time', 0)
        execution_record.stdout = result.get('result', '') if result.get('success') else ''
        execution_record.stderr = result.get('error', '') if not result.get('success') else ''
        execution_record.return_code = result.get('return_code', 1)
        
        # Set extra vars and tags
        if variables:
            execution_record.set_extra_vars(variables)
        if tags:
            execution_record.set_tags_list(tags)
        if skip_tags:
            execution_record.set_skip_tags_list(skip_tags)
        
        execution_record.save()
        
        # Send webhook for completion
        event_type = 'ansible_execution_completed' if result.get('success') else 'ansible_execution_failed'
        WebhookManager.send_ansible_webhook_notification(
            execution_record, event_type
        )
        
        return {
            'success': True,
            'execution_id': str(execution_record.id),
            'task_id': f"device_{device_id}_{int(time.time())}",
            'result': result
        }
        
    except Device.DoesNotExist:
        # Send failure webhook if we have an execution record
        try:
            if 'execution_record' in locals():
                execution_record.status = 'failed'
                execution_record.completed_at = datetime.now()
                execution_record.stderr = f'Device with ID {device_id} not found'
                execution_record.save()
                WebhookManager.send_ansible_webhook_notification(
                    execution_record, 'ansible_execution_failed'
                )
        except:
            pass
        
        return {
            'success': False,
            'error': f'Device with ID {device_id} not found'
        }
    except Exception as e:
        # Send failure webhook if we have an execution record
        try:
            if 'execution_record' in locals():
                execution_record.status = 'failed'
                execution_record.completed_at = datetime.now()
                execution_record.stderr = f'Background execution failed: {str(e)}'
                execution_record.save()
                WebhookManager.send_ansible_webhook_notification(
                    execution_record, 'ansible_execution_failed'
                )
        except:
            pass
        
        return {
            'success': False,
            'error': f'Background execution failed: {str(e)}'
        }


def execute_ansible_playbook_task(execution_id):
    """
    Celery task to execute Ansible playbook
    
    Args:
        execution_id: UUID of AnsibleExecution record
    """
    try:
        # Get execution record
        execution = AnsibleExecution.objects.get(id=execution_id)
        
        # Update status to running
        execution.status = 'running'
        execution.started_at = datetime.now()
        execution.save()
        
        # Get playbook and inventory
        playbook = execution.playbook
        inventory = execution.inventory
        
        # Prepare execution parameters
        extra_vars = execution.get_extra_vars()
        tags = execution.get_tags_list()
        skip_tags = execution.get_skip_tags_list()
        
        # Execute playbook
        runner = AnsibleRunner()
        results = runner.execute_playbook(
            playbook_content=playbook.playbook_content,
            inventory_content=inventory.inventory_content,
            extra_vars=extra_vars,
            tags=tags,
            skip_tags=skip_tags,
            execution_id=execution_id
        )
        
        return {
            'success': True,
            'execution_id': str(execution_id),
            'return_code': results['return_code'],
            'execution_time': results.get('execution_time', 0)
        }
        
    except AnsibleExecution.DoesNotExist:
        return {
            'success': False,
            'error': f'Execution record {execution_id} not found'
        }
    except Exception as e:
        # Update execution status to failed
        try:
            execution = AnsibleExecution.objects.get(id=execution_id)
            execution.status = 'failed'
            execution.stderr = f"Execution error: {str(e)}"
            execution.completed_at = datetime.now()
            execution.save()
        except Exception:
            pass
        
        return {
            'success': False,
            'error': str(e)
        }


def validate_ansible_playbook_content(playbook_content):
    """
    Validate Ansible playbook content
    
    Args:
        playbook_content: YAML content of the playbook
        
    Returns:
        dict: Validation results
    """
    runner = AnsibleRunner()
    return runner.validate_playbook(playbook_content)


def validate_ansible_inventory_content(inventory_content):
    """
    Validate Ansible inventory content
    
    Args:
        inventory_content: Inventory content
        
    Returns:
        dict: Validation results
    """
    runner = AnsibleRunner()
    return runner.validate_inventory(inventory_content)

def generate_device_inventory(device, group_name="network_devices"):
    """
    Generate Ansible inventory content from a device object
    
    Args:
        device: Device model instance
        group_name: Name of the host group (default: network_devices)
        
    Returns:
        str: Ansible inventory content in INI format
    """
    try:
        # Get device information
        hostname = device.hostname or device.name
        ip_address = device.ip_address
        device_type = device.device_type
        vendor = device.vendor or "unknown"
        model = device.model or "unknown"
        
        # Build host variables
        host_vars = {
            'ansible_host': ip_address,
            'ansible_port': device.ssh_port,
            'device_type': device_type,
            'device_vendor': vendor,
            'device_model': model,
            'device_name': device.name,
            'location': device.location or "unknown"
        }
        
        # Create inventory content
        inventory_lines = []
        inventory_lines.append(f"[{group_name}]")
        inventory_lines.append(
            f"{hostname} ansible_host={ip_address} ansible_port={device.ssh_port}"
        )
        inventory_lines.append("")
        inventory_lines.append(f"[{group_name}:vars]")
        
        # Add host variables
        for key, value in host_vars.items():
            inventory_lines.append(f"{key}={value}")
        
        return "\n".join(inventory_lines)
        
    except Exception as e:
        raise Exception(
            f"Failed to generate inventory for device {device.name}: {str(e)}"
        )


def execute_ansible_playbook_on_device(
    device, playbook_content, variables=None, tags=None, skip_tags=None
):
    """
    Execute Ansible playbook directly on a specific device
    
    Args:
        device: Device model instance
        playbook_content: YAML content of the Ansible playbook
        variables: Dictionary of extra variables (optional)
        tags: List of tags to run (optional)
        skip_tags: List of tags to skip (optional)
        
    Returns:
        dict: Execution results
    """
    try:
        # Generate inventory for the device
        inventory_content = generate_device_inventory(device)
        
        # Set default variables
        default_variables = {
            'device_name': device.name,
            'device_hostname': device.hostname or device.name,
            'device_ip': device.ip_address,
            'device_type': device.device_type,
            'device_vendor': device.vendor or "unknown"
        }
        
        # Add Ansible network credentials from environment variables if available
        # These will be overridden if provided in the variables parameter
        env_credentials = {}
        
        # Get credentials using python-decouple (same as Django settings)
        ansible_user = config('ANSIBLE_NET_USERNAME', default=None)
        ansible_password = config('ANSIBLE_NET_PASSWORD', default=None)
        ansible_auth_pass = config('ANSIBLE_NET_AUTH_PASS', default=None)
        
        if ansible_user and isinstance(ansible_user, str):
            env_credentials['ansible_user'] = ansible_user
        if ansible_password and isinstance(ansible_password, str):
            env_credentials['ansible_password'] = ansible_password
        if ansible_auth_pass and isinstance(ansible_auth_pass, str):
            env_credentials['ansible_become_password'] = ansible_auth_pass
        
        # Merge with provided variables (provided variables override environment)
        final_variables = {**default_variables, **env_credentials, **(variables or {})}
        
        # Validate playbook content
        validation_result = validate_ansible_playbook_content(playbook_content)
        if not validation_result.get('valid', False):
            return {
                'success': False,
                'error': 'Invalid playbook content',
                'validation_error': validation_result.get(
                    'error', 'Unknown validation error'
                )
            }
        
        # Execute playbook
        runner = AnsibleRunner()
        result = runner.execute_playbook(
            playbook_content=playbook_content,
            inventory_content=inventory_content,
            extra_vars=final_variables,
            tags=tags,
            skip_tags=skip_tags
        )
        
        # Format response
        response = {
            'success': result['return_code'] == 0,
            'execution_time': result.get('execution_time', 0),
            'return_code': result['return_code'],
            'device_info': {
                'name': device.name,
                'hostname': device.hostname or device.name,
                'ip_address': device.ip_address,
                'device_type': device.device_type,
                'vendor': device.vendor or "unknown"
            },
            'playbook_info': {
                'valid': True,
                'plays': validation_result.get('plays', 1)
            },
            'variables_used': final_variables
        }
        
        if result['return_code'] == 0:
            response['result'] = result['stdout']
        else:
            response['error'] = result['stderr']
        
        return response
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Execution failed: {str(e)}',
            'device_info': {
                'name': device.name if device else 'unknown',
                'hostname': device.hostname if device else 'unknown',
                'ip_address': device.ip_address if device else 'unknown'
            }
        }
