import json
import logging
from django.contrib.auth.models import AnonymousUser
from .models import SystemLog

logger = logging.getLogger(__name__)


class SystemLogger:
    """System logger for tracking events and changes"""
    
    @staticmethod
    def log(level, log_type, message, user=None, details=None, 
            object_type=None, object_id=None, old_values=None, new_values=None,
            request=None):
        """Create a system log entry"""
        try:
            log_entry = SystemLog.objects.create(
                level=level,
                type=log_type,
                message=message,
                details=details or "",
                user=user if user and not isinstance(user, AnonymousUser) else None,
                ip_address=request.META.get('REMOTE_ADDR') if request else None,
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else "",
                object_type=object_type or "",
                object_id=object_id or "",
                old_values=json.dumps(old_values, indent=2) if old_values else "",
                new_values=json.dumps(new_values, indent=2) if new_values else ""
            )
            return log_entry
        except Exception as e:
            # Fallback to regular logging if database logging fails
            logger.error(f"Failed to create system log: {e}")
            return None
    
    @staticmethod
    def info(message, log_type='SYSTEM', user=None, details=None, 
             object_type=None, object_id=None, request=None):
        """Log info level message"""
        return SystemLogger.log('INFO', log_type, message, user, details,
                               object_type, object_id, request=request)
    
    @staticmethod
    def warning(message, log_type='SYSTEM', user=None, details=None,
                object_type=None, object_id=None, request=None):
        """Log warning level message"""
        return SystemLogger.log('WARNING', log_type, message, user, details,
                               object_type, object_id, request=request)
    
    @staticmethod
    def error(message, log_type='SYSTEM', user=None, details=None,
              object_type=None, object_id=None, request=None):
        """Log error level message"""
        return SystemLogger.log('ERROR', log_type, message, user, details,
                               object_type, object_id, request=request)
    
    @staticmethod
    def audit(message, log_type='AUDIT', user=None, details=None,
              object_type=None, object_id=None, old_values=None, new_values=None, request=None):
        """Log audit trail for changes"""
        return SystemLogger.log('AUDIT', log_type, message, user, details,
                               object_type, object_id, old_values, new_values, request)
    
    @staticmethod
    def tacacs_change(message, user=None, old_config=None, new_config=None, request=None):
        """Log TACACS configuration changes"""
        return SystemLogger.audit(
            message=message,
            log_type='TACACS',
            user=user,
            object_type='TACACS',
            object_id='configuration',
            old_values=old_config,
            new_values=new_config,
            request=request
        )


class ModelChangeTracker:
    """Track changes to Django models"""
    
    @staticmethod
    def track_model_change(instance, old_instance=None, user=None, request=None):
        """Track changes to a model instance"""
        if not hasattr(instance, '_meta'):
            return
        
        model_name = instance._meta.model_name
        object_id = str(instance.pk)
        
        # Get field changes
        old_values = {}
        new_values = {}
        
        if old_instance:
            for field in instance._meta.fields:
                field_name = field.name
                old_val = getattr(old_instance, field_name, None)
                new_val = getattr(instance, field_name, None)
                
                # Convert to string for comparison
                old_str = str(old_val) if old_val is not None else ""
                new_str = str(new_val) if new_val is not None else ""
                
                if old_str != new_str:
                    old_values[field_name] = old_str
                    new_values[field_name] = new_str
        
        # Only log if there are actual changes
        if old_values or new_values:
            change_type = "created" if not old_instance else "updated"
            message = f"{model_name.title()} {change_type}: {object_id}"
            
            SystemLogger.audit(
                message=message,
                log_type='CONFIGURATION',
                user=user,
                object_type=model_name,
                object_id=object_id,
                old_values=old_values if old_values else None,
                new_values=new_values if new_values else None,
                request=request
            )


def log_tacacs_setup(user=None, request=None):
    """Log TACACS setup changes"""
    SystemLogger.tacacs_change(
        message="TACACS authentication system setup completed",
        user=user,
        old_config=None,
        new_config={
            "setup_date": "2025-12-10",
            "features": [
                "Centralized TACACS credentials",
                "Environment variable configuration",
                "Device password fields deprecated",
                "SSH utility integration"
            ]
        },
        request=request
    )


def log_device_creation(device, user=None, request=None):
    """Log device creation with TACACS context"""
    SystemLogger.audit(
        message=f"Device created with TACACS authentication: {device.name}",
        log_type='DEVICE',
        user=user,
        object_type='device',
        object_id=str(device.pk),
        new_values={
            "name": device.name,
            "ip_address": device.ip_address,
            "device_type": device.device_type,
            "authentication": "TACACS (centralized)",
            "username_field": device.username
        },
        request=request
    )


def log_workflow_execution_start(execution, user=None, request=None):
    """Log workflow execution start"""
    SystemLogger.info(
        message=f"Workflow execution started: {execution.workflow.name} on {execution.device.name}",
        log_type='WORKFLOW',
        user=user,
        object_type='workflow_execution',
        object_id=str(execution.pk),
        details=f"Device: {execution.device.name} ({execution.device.ip_address})",
        request=request
    )


def log_workflow_execution_complete(execution, user=None, request=None):
    """Log workflow execution completion"""
    SystemLogger.info(
        message=f"Workflow execution completed: {execution.workflow.name} - Status: {execution.status}",
        log_type='WORKFLOW',
        user=user,
        object_type='workflow_execution',
        object_id=str(execution.pk),
        details=f"Duration: {execution.completed_at - execution.started_at if execution.started_at and execution.completed_at else 'Unknown'}",
        request=request
    )


def log_workflow_execution_error(execution, error_message, user=None, request=None):
    """Log workflow execution error"""
    SystemLogger.error(
        message=f"Workflow execution failed: {execution.workflow.name} - {error_message}",
        log_type='WORKFLOW',
        user=user,
        object_type='workflow_execution',
        object_id=str(execution.pk),
        details=error_message,
        request=request
    )