"""
Ansible utilities for executing playbooks and managing inventory
"""
import os
import tempfile
import subprocess
import json
import yaml
from datetime import datetime
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
                
                # Execute command
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
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