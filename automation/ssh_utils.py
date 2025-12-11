import paramiko
import time
import logging
import os
from django.conf import settings
from paramiko.ssh_exception import SSHException, AuthenticationException

logger = logging.getLogger(__name__)


class SSHConnection:
    """SSH connection handler for network devices"""
    
    def __init__(self, hostname, username, password, port=22, timeout=30, enable_password=None):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.port = port
        self.timeout = timeout
        self.enable_password = enable_password
        self.client = None
        self.shell = None
        self.connected = False
    
    def connect(self):
        """Establish SSH connection to the device"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            self.client.connect(
                hostname=self.hostname,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=self.timeout,
                look_for_keys=False,
                allow_agent=False
            )
            
            self.shell = self.client.invoke_shell()
            self.connected = True
            logger.info(f"Successfully connected to {self.hostname}")
            return True
            
        except AuthenticationException:
            logger.error(f"Authentication failed for {self.hostname}")
            return False
        except SSHException as e:
            logger.error(f"SSH connection failed for {self.hostname}: {e}")
            return False
        except Exception as e:
            logger.error(f"Connection failed for {self.hostname}: {e}")
            return False
    
    def execute_command(self, command, wait_time=2):
        """Execute a command on the device and return the output"""
        if not self.connected:
            return False, "Not connected to device"
        
        try:
            # Send command
            self.shell.send(command + '\n')
            time.sleep(wait_time)
            
            # Get output
            output = ""
            while self.shell.recv_ready():
                chunk = self.shell.recv(4096).decode('utf-8')
                output += chunk
                time.sleep(0.1)
            
            return True, output
            
        except Exception as e:
            logger.error(f"Command execution failed on {self.hostname}: {e}")
            return False, str(e)
    
    def enable_privilege_mode(self):
        """Enter enable/privilege mode if password is provided"""
        if not self.enable_password:
            return True
        
        try:
            # Send enable command
            self.shell.send('enable\n')
            time.sleep(1)
            
            # Send enable password
            self.shell.send(self.enable_password + '\n')
            time.sleep(1)
            
            # Check if we're in enable mode
            output = ""
            while self.shell.recv_ready():
                chunk = self.shell.recv(4096).decode('utf-8')
                output += chunk
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to enter enable mode on {self.hostname}: {e}")
            return False
    
    def disconnect(self):
        """Close the SSH connection"""
        if self.client:
            self.client.close()
            self.connected = False
            logger.info(f"Disconnected from {self.hostname}")


def execute_command_on_device(device, command):
    """Execute a command on a network device using TACACS credentials"""
    # Get TACACS credentials from environment variables
    tacacs_username = os.getenv('TACACS_USERNAME')
    tacacs_password = os.getenv('TACACS_PASSWORD')
    tacacs_enable_password = os.getenv('TACACS_ENABLE_PASSWORD')
    
    if not tacacs_username or not tacacs_password:
        logger.error("TACACS credentials not configured in environment variables")
        return False, "TACACS credentials not configured"
    
    ssh = SSHConnection(
        hostname=device.ip_address,
        username=tacacs_username,
        password=tacacs_password,
        port=device.ssh_port,
        timeout=settings.SSH_TIMEOUT,
        enable_password=tacacs_enable_password
    )
    
    try:
        if ssh.connect():
            # Enter enable mode if password is provided
            if device.enable_password:
                ssh.enable_privilege_mode()
            
            # Execute command
            success, output = ssh.execute_command(command)
            
            if success:
                logger.info(f"Command executed successfully on {device.name}: {command}")
            else:
                logger.error(f"Command failed on {device.name}: {output}")
            
            return success, output
        else:
            return False, "Failed to connect to device"
            
    except Exception as e:
        logger.error(f"Error executing command on {device.name}: {e}")
        return False, str(e)
    finally:
        ssh.disconnect()


def validate_output(output, validation_rule):
    """Validate command output using regex with comparison operators"""
    try:
        import re

        if 'regex' in validation_rule:
            pattern = validation_rule['regex']
            match = re.search(pattern, output, re.MULTILINE | re.DOTALL)

            # Get comparison operator (default to 'contains' if not specified)
            operator = validation_rule.get('operator', 'contains').lower()

            if operator == 'contains':
                # Default behavior: check if pattern is found in output
                return bool(match), match.group() if match else ""
            elif operator == 'equal':
                # Check if the entire output exactly matches the pattern
                full_match = re.fullmatch(pattern, output, re.MULTILINE | re.DOTALL)
                return bool(full_match), full_match.group() if full_match else ""
            elif operator == 'not_equal':
                # Check if the output does NOT match the pattern
                full_match = re.fullmatch(pattern, output, re.MULTILINE | re.DOTALL)
                return not bool(full_match), "Output does not match pattern" if not full_match else "Output matches pattern (validation failed)"
            elif operator == 'not_contains':
                # Check if the pattern is NOT found in output
                return not bool(match), "Pattern not found (validation passed)" if not match else "Pattern found (validation failed)"
            else:
                # Unknown operator, fall back to default contains behavior
                logger.warning(f"Unknown validation operator '{operator}', using 'contains'")
                return bool(match), match.group() if match else ""

        # Add AI validation here if API key is provided
        # This is a placeholder for AI validation
        if 'ai_validation' in validation_rule and hasattr(settings, 'AI_API_KEY') and settings.AI_API_KEY:
            # AI validation logic would go here
            return True, "AI validation passed"

        # Default: if no validation rules, consider it passed
        return True, "No validation rules provided"

    except Exception as e:
        logger.error(f"Validation error: {e}")
        return False, str(e)