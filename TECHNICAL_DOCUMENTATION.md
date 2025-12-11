# Network Automation Tool - Technical Documentation

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Database Schema](#database-schema)
5. [API Design Patterns](#api-design-patterns)
6. [Authentication System](#authentication-system)
7. [Celery Task Processing](#celery-task-processing)
8. [Webhook Implementation](#webhook-implementation)
9. [SSH Integration](#ssh-integration)
10. [Error Handling](#error-handling)
11. [Logging System](#logging-system)
12. [Deployment Guide](#deployment-guide)
13. [Development Setup](#development-setup)
14. [Testing Strategy](#testing-strategy)
15. [Performance Optimization](#performance-optimization)
16. [Security Considerations](#security-considerations)

## System Architecture

### High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Web Browser (React.js)                                  │  │
│  │  - Responsive UI                                         │  │
│  │  - State Management (React Query)                        │  │
│  │  - Routing (React Router)                               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │ HTTP/HTTPS
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Django REST API                                        │  │
│  │  - CORS Support                                         │  │
│  │  - JSON Serialization                                   │  │
│  │  - Authentication Middleware                            │  │
│  │  - Rate Limiting                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Django Models & Services                              │  │
│  │  - Data Validation                                      │  │
│  │  - Business Rules                                       │  │
│  │  - Workflow Processing                                  │  │
│  │  - Event Handling                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Django ORM                                            │  │
│  │  - Database Abstraction                                 │  │
│  │  - Query Optimization                                   │  │
│  │  - Transaction Management                               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                        PERSISTENCE LAYER                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  MariaDB/MySQL/PostgreSQL                              │  │
│  │  - Relational Database                                 │  │
│  │  - Indexes & Constraints                               │  │
│  │  - Backup & Recovery                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                        ASYNC PROCESSING LAYER                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Celery + Redis/RabbitMQ                              │  │
│  │  - Task Queue                                         │  │
│  │  - Workflow Execution                                  │  │
│  │  - Retry Logic                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                        NETWORK DEVICES                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  SSH Connections                                      │  │
│  │  - Routers                                            │  │
│  │  - Switches                                           │  │
│  │  - Firewalls                                          │  │
│  │  - Load Balancers                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Component Diagram

```mermaid
componentDiagram
    component Frontend {
        component ReactApp
        component AuthContext
        component APIService
    }

    component Backend {
        component DjangoAPI
        component AuthViews
        component APIViews
        component Models
        component Serializers
        component Tasks
    }

    component Database {
        component MariaDB
    }

    component AsyncProcessing {
        component Celery
        component Redis
    }

    component NetworkDevices {
        component SSHConnections
    }

    ReactApp --> APIService : HTTP Requests
    APIService --> DjangoAPI : REST API Calls
    DjangoAPI --> AuthViews : Authentication
    DjangoAPI --> APIViews : Business Logic
    APIViews --> Models : Data Access
    Models --> MariaDB : Database Operations
    APIViews --> Tasks : Async Processing
    Tasks --> Celery : Task Execution
    Celery --> Redis : Task Queue
    Tasks --> SSHConnections : Device Communication
```

## Backend Implementation

### Django Project Structure

```
network_automation/          # Main Django project
├── __init__.py
├── asgi.py
├── settings.py             # Project settings
├── urls.py                 # Main URL routing
├── wsgi.py
└── cors_middleware.py      # CORS middleware

automation/                 # Main app
├── __init__.py
├── admin.py                # Django admin configuration
├── apps.py                 # App configuration
├── models.py               # Database models
├── serializers.py          # Data serialization
├── api_views.py            # REST API views
├── api_auth_views.py       # Authentication views
├── tasks.py                # Celery tasks
├── ssh_utils.py            # SSH utilities
├── webhook_utils.py        # Webhook utilities
├── log_utils.py            # Logging utilities
├── consumers.py            # WebSocket consumers
├── routing.py              # WebSocket routing
├── views.py                # Regular views
├── views_swagger.py        # Swagger documentation
├── api_urls.py             # API URL routing
└── urls.py                 # App URL routing

frontend/                  # React frontend
├── package.json
├── public/
└── src/
    ├── components/
    ├── pages/
    ├── services/
    ├── context/
    ├── hooks/
    └── utils/
```

### Key Django Settings

```python
# settings.py

# Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'network_automation',
        'USER': 'db_user',
        'PASSWORD': 'db_password',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# Celery Configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Authentication
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}
```

### API View Structure

```python
# Example API view structure from api_views.py

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def device_list(request):
    """API endpoint to list all devices"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return create_cors_response({}, status=200)

    try:
        # Business logic
        devices = Device.objects.all()

        # Pagination
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))
        paginator = Paginator(devices, per_page)
        page_obj = paginator.get_page(page)

        # Data transformation
        device_list = []
        for device in page_obj:
            device_data = {
                'id': str(device.id),
                'name': device.name,
                # ... other fields
            }
            device_list.append(device_data)

        # Response
        return create_cors_response({
            'devices': device_list,
            'total': devices.count(),
            'page': page,
            'per_page': per_page,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        })

    except Exception as e:
        return create_cors_response({'error': str(e)}, status=500)
```

## Frontend Implementation

### React Project Structure

```
frontend/
├── package.json
├── tailwind.config.js
├── public/
│   ├── index.html
│   └── favicon.ico
└── src/
    ├── index.js
    ├── index.css
    ├── App.js
    ├── components/
    │   ├── Layout.js
    │   ├── StatCard.js
    │   ├── StatusBadge.js
    │   └── ...
    ├── pages/
    │   ├── Login.js
    │   ├── Dashboard.js
    │   ├── Devices.js
    │   ├── Workflows.js
    │   ├── Executions.js
    │   ├── ExecutionDetail.js
    │   ├── CreateDevice.js
    │   ├── CreateWorkflow.js
    │   ├── WorkflowView.js
    │   ├── WorkflowEdit.js
    │   ├── ExecuteWorkflow.js
    │   ├── Logs.js
    │   ├── DeviceMapping.js
    │   └── WebhookConfigurations.js
    ├── services/
    │   └── api.js
    ├── context/
    │   └── AuthContext.js
    ├── hooks/
    │   └── useAuth.js
    └── utils/
        └── helpers.js
```

### Key Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.3.0",
    "react-query": "^3.39.0",
    "react-hot-toast": "^2.4.0",
    "axios": "^0.27.2",
    "@heroicons/react": "^1.0.6",
    "tailwindcss": "^3.1.0",
    "autoprefixer": "^10.4.7",
    "postcss": "^8.4.14"
  },
  "devDependencies": {
    "vite": "^3.0.0",
    "@vitejs/plugin-react": "^2.0.0"
  }
}
```

### API Service Implementation

```javascript
// services/api.js

import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Add CSRF token if available
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.error ||
                        error.response?.data?.message ||
                        error.message ||
                        'An unknown error occurred';

    // Handle specific error codes
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      // Redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission.');
    } else {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// Helper function to get cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// API Methods
export default {
  // Authentication
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  getUser: () => api.get('/auth/user/'),
  getCsrfToken: () => api.get('/auth/csrf/'),

  // Devices
  getDevices: (params) => api.get('/devices/', { params }),
  createDevice: (deviceData) => api.post('/devices/', deviceData),
  getDeviceGrouping: () => api.get('/devices/grouping/'),

  // Workflows
  getWorkflows: () => api.get('/workflows/'),
  getWorkflow: (id) => api.get(`/workflows/${id}/`),
  createWorkflow: (workflowData) => api.post('/workflows/', workflowData),
  updateWorkflow: (id, workflowData) => api.put(`/workflows/${id}/`, workflowData),
  executeWorkflow: (executionData) => api.post('/workflows/execute/', executionData),

  // Executions
  getExecutions: (params) => api.get('/executions/', { params }),
  getExecution: (id) => api.get(`/executions/${id}/`),

  // Webhooks
  getWebhooks: () => api.get('/webhooks/'),
  getWebhook: (id) => api.get(`/webhooks/${id}/`),
  createWebhook: (webhookData) => api.post('/webhooks/', webhookData),
  updateWebhook: (id, webhookData) => api.put(`/webhooks/${id}/`, webhookData),
  deleteWebhook: (id) => api.delete(`/webhooks/${id}/`),
  testWebhook: (id) => api.post(`/webhooks/${id}/test/`),

  // Logs
  getLogs: (params) => api.get('/logs/', { params }),
  getLog: (id) => api.get(`/logs/${id}/`)
};
```

### Authentication Context

```javascript
// context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check auth status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get CSRF token first
        await api.getCsrfToken();

        // Check current user
        const userData = await api.getUser();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.login({ username, password });
      setUser(response.user);
      navigate('/dashboard');
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## Database Schema

### Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Device : creates
    User ||--o{ Workflow : creates
    User ||--o{ WorkflowExecution : creates
    User ||--o{ SystemLog : creates
    User ||--o{ WebhookConfiguration : creates

    Workflow ||--o{ WorkflowExecution : has
    Device ||--o{ WorkflowExecution : has

    WorkflowExecution ||--o{ CommandExecution : has

    Device {
        UUID id PK
        string name
        string hostname
        string ip_address
        enum device_type
        enum status
        int ssh_port
        string vendor
        string model
        string os_version
        string location
        text description
        datetime created_at
        datetime updated_at
    }

    Workflow {
        UUID id PK
        string name
        text description
        enum status
        text pre_check_commands
        text implementation_commands
        text post_check_commands
        text rollback_commands
        text validation_rules
        datetime created_at
        datetime updated_at
    }

    WorkflowExecution {
        UUID id PK
        UUID workflow_id FK
        UUID device_id FK
        enum status
        enum current_stage
        datetime started_at
        datetime completed_at
        text error_message
        text dynamic_params
        text pre_check_results
        text implementation_results
        text post_check_results
        text rollback_results
        datetime created_at
    }

    CommandExecution {
        UUID id PK
        UUID workflow_execution_id FK
        text command
        enum stage
        enum status
        text output
        text error_output
        int exit_code
        float execution_time
        datetime started_at
        datetime completed_at
        text validation_result
    }

    SystemLog {
        UUID id PK
        enum level
        enum type
        text message
        text details
        string ip_address
        string user_agent
        string object_type
        string object_id
        text old_values
        text new_values
        datetime created_at
    }

    WebhookConfiguration {
        UUID id PK
        string name
        text description
        string webhook_url
        enum events
        enum method
        boolean is_active
        string secret_key
        datetime created_at
        datetime updated_at
    }
```

### Database Optimization

#### Indexes

```python
# models.py - SystemLog indexes example

class SystemLog(models.Model):
    # ... fields ...

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['level']),
            models.Index(fields=['type']),
            models.Index(fields=['object_type', 'object_id']),
        ]
```

#### JSON Field Handling

```python
# models.py - JSON field handling example

class Workflow(models.Model):
    # MariaDB-compatible fields - store JSON as text
    pre_check_commands = models.TextField(default='[]', blank=True)
    implementation_commands = models.TextField(default='[]', blank=True)
    post_check_commands = models.TextField(default='[]', blank=True)
    rollback_commands = models.TextField(default='[]', blank=True)
    validation_rules = models.TextField(default='{}', blank=True)

    def get_pre_check_commands(self):
        """Parse JSON commands from text field"""
        try:
            return json.loads(self.pre_check_commands) if self.pre_check_commands else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_pre_check_commands(self, commands):
        """Store commands as JSON in text field"""
        self.pre_check_commands = json.dumps(commands)
```

## API Design Patterns

### RESTful API Design

| Resource | Endpoint | Methods | Description |
|----------|----------|---------|-------------|
| Devices | `/api/devices/` | GET, POST | List/create devices |
| Devices | `/api/devices/grouping/` | GET | Get device groupings |
| Workflows | `/api/workflows/` | GET, POST | List/create workflows |
| Workflows | `/api/workflows/:id/` | GET, PUT | Get/update workflow |
| Workflows | `/api/workflows/execute/` | POST | Execute workflow |
| Executions | `/api/executions/` | GET | List executions |
| Executions | `/api/executions/:id/` | GET | Get execution details |
| Webhooks | `/api/webhooks/` | GET, POST | List/create webhooks |
| Webhooks | `/api/webhooks/:id/` | GET, PUT, DELETE | CRUD webhook |
| Webhooks | `/api/webhooks/:id/test/` | POST | Test webhook |
| Logs | `/api/logs/` | GET | List logs |
| Logs | `/api/logs/:id/` | GET | Get log details |
| Auth | `/api/auth/login/` | POST | Login |
| Auth | `/api/auth/logout/` | POST | Logout |
| Auth | `/api/auth/user/` | GET | Get current user |
| Auth | `/api/auth/csrf/` | GET | Get CSRF token |

### API Response Structure

```json
{
  "success_response": {
    "data": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Example Device",
      "ip_address": "192.168.1.1",
      "status": "online"
    },
    "meta": {
      "total": 1,
      "page": 1,
      "per_page": 10,
      "has_next": false,
      "has_previous": false
    }
  },
  "error_response": {
    "error": "Invalid credentials",
    "status": 401
  }
}
```

### CORS Implementation

```python
# api_views.py - CORS response helper

def create_cors_response(data, status=200):
    """Create JSON response with CORS headers"""
    response = JsonResponse(data, status=status)

    # Get the origin from request or use a specific origin for development
    origin = getattr(settings, 'CORS_ALLOW_ORIGIN', '*')

    response['Access-Control-Allow-Origin'] = origin
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = (
        'Content-Type, Authorization, X-Requested-With, X-CSRFToken'
    )
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Allow-Age'] = '86400'  # 24 hours

    return response
```

## Authentication System

### Session-Based Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant Database

    Browser->>Frontend: Load login page
    Frontend->>Backend: GET /api/auth/csrf/
    Backend->>Frontend: Set CSRF cookie
    Frontend->>Browser: Render login form

    Browser->>Frontend: Submit credentials
    Frontend->>Backend: POST /api/auth/login/ {username, password, X-CSRFToken}
    Backend->>Database: Validate credentials
    Database-->>Backend: User record
    Backend->>Frontend: Set session cookie, {user: {...}}
    Frontend->>Browser: Store user context, redirect to dashboard

    Browser->>Frontend: Request protected resource
    Frontend->>Backend: GET /api/devices/ {session cookie, X-CSRFToken}
    Backend->>Database: Validate session
    Database-->>Backend: Session valid
    Backend->>Frontend: {devices: [...]}

    Browser->>Frontend: Click logout
    Frontend->>Backend: POST /api/auth/logout/ {session cookie, X-CSRFToken}
    Backend->>Database: Invalidate session
    Backend->>Frontend: {message: "Logout successful"}
    Frontend->>Browser: Clear context, redirect to login
```

### CSRF Protection

```python
# CORS and CSRF middleware configuration

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'network_automation.cors_middleware.CorsMiddleware',
]

# CSRF settings
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript access for React
CSRF_COOKIE_SECURE = True     # HTTPS only in production
CSRF_COOKIE_SAMESITE = 'Lax'
```

## Celery Task Processing

### Task Definition

```python
# tasks.py

from celery import shared_task
from .models import WorkflowExecution, CommandExecution
from .ssh_utils import execute_ssh_command
import time
import json

@shared_task(bind=True, max_retries=3)
def execute_workflow(self, execution_id):
    """Execute a workflow on a device"""
    try:
        execution = WorkflowExecution.objects.get(id=execution_id)
        workflow = execution.workflow
        device = execution.device

        # Update execution status
        execution.status = 'running'
        execution.started_at = timezone.now()
        execution.save()

        # Execute pre-check commands
        await execute_stage(execution, 'pre_check', workflow.get_pre_check_commands())

        # Execute implementation commands
        await execute_stage(execution, 'implementation', workflow.get_implementation_commands())

        # Execute post-check commands
        await execute_stage(execution, 'post_check', workflow.get_post_check_commands())

        # Mark as completed
        execution.status = 'completed'
        execution.completed_at = timezone.now()
        execution.save()

        return {'status': 'success', 'execution_id': str(execution.id)}

    except Exception as e:
        # Handle execution failure
        execution.status = 'failed'
        execution.error_message = str(e)
        execution.completed_at = timezone.now()
        execution.save()

        # Attempt rollback if implementation was started
        if execution.current_stage in ['implementation', 'post_check']:
            await execute_rollback(execution)

        raise self.retry(exc=e, countdown=60)

async def execute_stage(execution, stage, commands):
    """Execute commands for a specific stage"""
    execution.current_stage = stage
    execution.save()

    results = {}

    for i, command in enumerate(commands):
        cmd_text = command if isinstance(command, str) else command.get('command', '')
        regex_pattern = command.get('regex_pattern', '') if isinstance(command, dict) else ''
        operator = command.get('operator', 'contains') if isinstance(command, dict) else 'contains'

        # Create command execution record
        cmd_exec = CommandExecution.objects.create(
            workflow_execution=execution,
            command=cmd_text,
            stage=stage,
            status='running',
            started_at=timezone.now()
        )

        try:
            # Execute command via SSH
            start_time = time.time()
            output, error_output, exit_code = await execute_ssh_command(
                device=execution.device,
                command=cmd_text
            )
            execution_time = time.time() - start_time

            # Validate output if regex pattern provided
            validation_result = validate_output(output, regex_pattern, operator)

            # Update command execution
            cmd_exec.output = output
            cmd_exec.error_output = error_output
            cmd_exec.exit_code = exit_code
            cmd_exec.execution_time = execution_time
            cmd_exec.validation_result = validation_result
            cmd_exec.status = 'completed' if exit_code == 0 else 'failed'
            cmd_exec.completed_at = timezone.now()
            cmd_exec.save()

            results[cmd_text] = {
                'output': output,
                'error': error_output,
                'exit_code': exit_code,
                'validation': validation_result
            }

        except Exception as e:
            cmd_exec.error_output = str(e)
            cmd_exec.status = 'failed'
            cmd_exec.completed_at = timezone.now()
            cmd_exec.save()

            results[cmd_text] = {
                'error': str(e),
                'exit_code': 1
            }

            # If any command fails, fail the entire stage
            raise Exception(f"Command failed: {cmd_text}")

    # Store stage results
    if stage == 'pre_check':
        execution.set_pre_check_results(results)
    elif stage == 'implementation':
        execution.set_implementation_results(results)
    elif stage == 'post_check':
        execution.set_post_check_results(results)

    execution.save()
```

### Task Retry Logic

```python
# Celery task retry configuration

@shared_task(bind=True, max_retries=3)
def execute_workflow(self, execution_id):
    try:
        # Task implementation
        pass
    except Exception as e:
        # Exponential backoff for retries
        countdown = 2 ** self.request.retries * 60  # 1, 2, 4 minutes

        # Update execution status for retry
        execution = WorkflowExecution.objects.get(id=execution_id)
        execution.status = 'pending'
        execution.error_message = f"Retry {self.request.retries + 1}: {str(e)}"
        execution.save()

        raise self.retry(exc=e, countdown=countdown)
```

## Webhook Implementation

### Webhook Manager

```python
# webhook_utils.py

import requests
import json
import hmac
import hashlib
from django.conf import settings
from .models import WebhookConfiguration, WorkflowExecution

class WebhookManager:
    @staticmethod
    def send_webhook(event_type, execution_id):
        """Send webhook notifications for execution events"""
        try:
            execution = WorkflowExecution.objects.get(id=execution_id)

            # Get active webhooks for this event
            webhooks = WebhookConfiguration.objects.filter(
                is_active=True,
                events__in=['all_events', event_type]
            )

            payload = {
                'event': event_type,
                'execution_id': str(execution_id),
                'workflow_id': str(execution.workflow.id),
                'workflow_name': execution.workflow.name,
                'device_id': str(execution.device.id),
                'device_name': execution.device.name,
                'status': execution.status,
                'timestamp': timezone.now().isoformat()
            }

            for webhook in webhooks:
                # Send webhook
                headers = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NetworkAutomationWebhook/1.0'
                }

                # Add signature if secret key provided
                if webhook.secret_key:
                    signature = WebhookManager.generate_signature(
                        payload, webhook.secret_key
                    )
                    headers['X-Webhook-Signature'] = signature

                response = requests.request(
                    method=webhook.method,
                    url=webhook.webhook_url,
                    headers=headers,
                    json=payload,
                    timeout=10
                )

                # Log webhook result
                if response.status_code >= 400:
                    # Handle webhook failure
                    pass

        except Exception as e:
            # Log webhook error
            pass

    @staticmethod
    def generate_signature(payload, secret_key):
        """Generate HMAC signature for webhook"""
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret_key.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    @staticmethod
    def send_test_webhook():
        """Send a test webhook for configuration testing"""
        try:
            # Create test payload
            payload = {
                'event': 'test',
                'message': 'This is a test webhook',
                'timestamp': timezone.now().isoformat()
            }

            # Use a test URL or configuration
            response = requests.post(
                'https://webhook.site/your-test-url',
                json=payload,
                timeout=10
            )

            return True, f"Test webhook sent. Status: {response.status_code}"

        except Exception as e:
            return False, f"Test webhook failed: {str(e)}"
```

### Webhook Event Processing

```python
# signals.py - Webhook event triggers

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import WorkflowExecution
from .webhook_utils import WebhookManager

@receiver(post_save, sender=WorkflowExecution)
def handle_execution_events(sender, instance, created, **kwargs):
    """Handle webhook events based on execution status changes"""
    if created:
        # New execution created (pending status)
        WebhookManager.send_webhook('execution_started', instance.id)
    else:
        # Check for status changes
        if instance.status == 'completed':
            WebhookManager.send_webhook('execution_completed', instance.id)
        elif instance.status == 'failed':
            WebhookManager.send_webhook('execution_failed', instance.id)
```

## SSH Integration

### SSH Utilities

```python
# ssh_utils.py

import paramiko
import socket
import time
from django.conf import settings

class SSHConnectionManager:
    def __init__(self, hostname, port, username, password, enable_password=None):
        self.hostname = hostname
        self.port = port
        self.username = username
        self.password = password
        self.enable_password = enable_password
        self.ssh_client = None
        self.shell = None

    def connect(self, timeout=10):
        """Establish SSH connection"""
        try:
            # Create SSH client
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Connect with timeout
            self.ssh_client.connect(
                hostname=self.hostname,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=timeout,
                banner_timeout=30,
                auth_timeout=30
            )

            # Create interactive shell
            self.shell = self.ssh_client.invoke_shell()
            time.sleep(1)  # Wait for shell to initialize

            return True

        except (paramiko.SSHException, socket.timeout, socket.error) as e:
            self.close()
            raise Exception(f"SSH connection failed: {str(e)}")

    def execute_command(self, command, timeout=30):
        """Execute a single command"""
        if not self.ssh_client or not self.ssh_client.get_transport().is_active():
            self.connect()

        try:
            # Send command
            self.shell.send(command + '\n')

            # Wait for command to complete
            start_time = time.time()
            output = ''
            error_output = ''

            while time.time() - start_time < timeout:
                if self.shell.recv_ready():
                    data = self.shell.recv(1024).decode('utf-8')
                    output += data

                    # Check for error patterns
                    if 'error' in data.lower() or 'invalid' in data.lower():
                        error_output += data

                    # Check for prompt (command completed)
                    if self._check_for_prompt(output):
                        break

                time.sleep(0.1)

            # Check if we need enable mode
            if 'invalid input' in output.lower() and self.enable_password:
                self._enter_enable_mode()
                return self.execute_command(command, timeout)

            return output, error_output, 0

        except Exception as e:
            return '', str(e), 1

    def _enter_enable_mode(self):
        """Enter enable mode if required"""
        self.shell.send('enable\n')
        time.sleep(0.5)
        self.shell.send(self.enable_password + '\n')
        time.sleep(0.5)

    def _check_for_prompt(self, output):
        """Check if command execution is complete"""
        # Common prompt patterns
        prompts = [
            '#',  # Privileged mode
            '$',  # User mode
            '>',  # Config mode
            ']#', # Some devices
            '] $' # Some devices
        ]

        return any(prompt in output[-10:] for prompt in prompts)

    def close(self):
        """Close SSH connection"""
        try:
            if self.shell:
                self.shell.close()
            if self.ssh_client:
                self.ssh_client.close()
        except:
            pass
        finally:
            self.ssh_client = None
            self.shell = None

def execute_ssh_command(device, command):
    """Execute command on device via SSH"""
    ssh_manager = SSHConnectionManager(
        hostname=device.hostname,
        port=device.ssh_port,
        username=device.username,
        password=device.password,
        enable_password=device.enable_password
    )

    try:
        ssh_manager.connect()
        output, error_output, exit_code = ssh_manager.execute_command(command)
        return output, error_output, exit_code
    finally:
        ssh_manager.close()
```

## Error Handling

### Backend Error Handling

```python
# api_views.py - Error handling pattern

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def device_create(request):
    try:
        # Parse request
        data = json.loads(request.body)

        # Validate required fields
        required_fields = ['name', 'hostname', 'ip_address', 'username', 'password']
        for field in required_fields:
            if field not in data:
                return create_cors_response({
                    'error': f'{field} is required',
                    'field': field
                }, status=400)

        # Business logic
        device = Device.objects.create(
            name=data['name'],
            # ... other fields
        )

        return create_cors_response({
            'id': str(device.id),
            'message': 'Device created successfully'
        }, status=201)

    except json.JSONDecodeError:
        return create_cors_response({
            'error': 'Invalid JSON data',
            'details': 'Request body must be valid JSON'
        }, status=400)

    except IntegrityError as e:
        if 'unique constraint' in str(e).lower():
            return create_cors_response({
                'error': 'Device with this name already exists',
                'field': 'name'
            }, status=409)
        return create_cors_response({
            'error': 'Database integrity error',
            'details': str(e)
        }, status=400)

    except Exception as e:
        # Log the error
        SystemLog.objects.create(
            level='ERROR',
            type='API',
            message='Device creation failed',
            details=str(e),
            user=request.user if request.user.is_authenticated else None
        )

        return create_cors_response({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }, status=500)
```

### Frontend Error Handling

```javascript
// API service error handling

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.error ||
                        error.response?.data?.message ||
                        error.message ||
                        'An unknown error occurred';

    // Handle specific error codes
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      // Redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission.');
    } else if (error.response?.status === 400) {
      // Validation errors
      if (error.response.data.field) {
        toast.error(`Validation error: ${error.response.data.field} - ${errorMessage}`);
      } else {
        toast.error(`Bad request: ${errorMessage}`);
      }
    } else if (error.response?.status === 404) {
      toast.error(`Resource not found: ${errorMessage}`);
    } else if (error.response?.status === 409) {
      toast.error(`Conflict: ${errorMessage}`);
    } else if (error.response?.status >= 500) {
      toast.error(`Server error: ${errorMessage}`);
    } else {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);
```

## Logging System

### System Log Implementation

```python
# log_utils.py

from .models import SystemLog
import json

def log_system_event(level, log_type, message, details=None, user=None, request=None):
    """Log system events with context"""
    try:
        # Extract additional context from request if available
        ip_address = None
        user_agent = None
        object_type = None
        object_id = None

        if request:
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            # Try to extract object info from request path
            path_parts = request.path.strip('/').split('/')
            if len(path_parts) >= 2:
                object_type = path_parts[1]
                if len(path_parts) >= 3 and path_parts[2].isdigit():
                    object_id = path_parts[2]

        # Create log entry
        SystemLog.objects.create(
            level=level,
            type=log_type,
            message=message,
            details=details,
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            object_type=object_type,
            object_id=object_id
        )

    except Exception as e:
        # Fallback logging if database fails
        print(f"Logging failed: {str(e)}")
        print(f"Original log: {level} - {log_type} - {message}")

def log_api_call(request, response, duration):
    """Log API calls for monitoring"""
    try:
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': duration,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'remote_addr': request.META.get('REMOTE_ADDR', '')
        }

        if request.user.is_authenticated:
            log_data['user_id'] = request.user.id
            log_data['username'] = request.user.username

        log_system_event(
            level='INFO',
            log_type='API',
            message=f"API call: {request.method} {request.path}",
            details=json.dumps(log_data),
            user=request.user if request.user.is_authenticated else None,
            request=request
        )

    except Exception as e:
        print(f"API logging failed: {str(e)}")
```

### Log Diff Implementation

```python
# models.py - SystemLog diff method

def get_diff_html(self):
    """Get HTML diff between old and new values"""
    if not self.old_values and not self.new_values:
        return ""

    import difflib

    old_lines = self.old_values.split('\n') if self.old_values else []
    new_lines = self.new_values.split('\n') if self.new_values else []

    diff = difflib.unified_diff(old_lines, new_lines, lineterm='')
    html_lines = []

    for line in diff:
        if line.startswith('---') or line.startswith('+++'):
            continue
        elif line.startswith('@@'):
            html_lines.append(f'<div class="diff-header">{line}</div>')
        elif line.startswith('+'):
            html_lines.append(f'<div class="diff-add">{line}</div>')
        elif line.startswith('-'):
            html_lines.append(f'<div class="diff-remove">{line}</div>')
        else:
            html_lines.append(f'<div class="diff-context">{line}</div>')

    return '\n'.join(html_lines)
```

## Deployment Guide

### Production Deployment

#### Requirements

- Python 3.8+
- Node.js 16+
- MariaDB/MySQL 10.5+
- Redis 6+
- Nginx/Apache (for reverse proxy)
- Supervisor (for process management)

#### Deployment Steps

1. **Database Setup**
   ```bash
   # Create database and user
   mysql -u root -p
   CREATE DATABASE network_automation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'netauto_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON network_automation.* TO 'netauto_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

2. **Backend Setup**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt

   # Run migrations
   python manage.py migrate

   # Collect static files
   python manage.py collectstatic

   # Create superuser
   python manage.py createsuperuser
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Configuration**
   ```bash
   # Edit settings.py for production
   DEBUG = False
   ALLOWED_HOSTS = ['yourdomain.com', 'localhost']
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'network_automation',
           'USER': 'netauto_user',
           'PASSWORD': 'secure_password',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }
   ```

5. **Process Management with Supervisor**
   ```ini
   ; /etc/supervisor/conf.d/network_automation.conf

   [program:network_automation]
   command=/path/to/venv/bin/gunicorn network_automation.wsgi:application --bind 0.0.0.0:8000 --workers 4
   directory=/path/to/project
   user=netauto
   autostart=true
   autorestart=true
   stderr_logfile=/var/log/network_automation.err.log
   stdout_logfile=/var/log/network_automation.out.log
   environment=PATH="/path/to/venv/bin",PYTHONUNBUFFERED="1"

   [program:celery_worker]
   command=/path/to/venv/bin/celery -A network_automation worker --loglevel=info
   directory=/path/to/project
   user=netauto
   autostart=true
   autorestart=true
   stderr_logfile=/var/log/celery.err.log
   stdout_logfile=/var/log/celery.out.log
   environment=PATH="/path/to/venv/bin",PYTHONUNBUFFERED="1"

   [program:celery_beat]
   command=/path/to/venv/bin/celery -A network_automation beat --loglevel=info
   directory=/path/to/project
   user=netauto
   autostart=true
   autorestart=true
   stderr_logfile=/var/log/celery_beat.err.log
   stdout_logfile=/var/log/celery_beat.out.log
   environment=PATH="/path/to/venv/bin",PYTHONUNBUFFERED="1"
   ```

6. **Nginx Configuration**
   ```nginx
   # /etc/nginx/sites-available/network_automation

   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /static/ {
           alias /path/to/project/staticfiles/;
           expires 30d;
       }

       location /media/ {
           alias /path/to/project/media/;
           expires 30d;
       }

       # WebSocket configuration
       location /ws/ {
           proxy_pass http://127.0.0.1:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

7. **Start Services**
   ```bash
   # Start supervisor
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start all

   # Start Nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

## Development Setup

### Local Development Environment

1. **Prerequisites**
   - Python 3.8+
   - Node.js 16+
   - Docker (optional for database)
   - Git

2. **Setup Steps**
   ```bash
   # Clone repository
   git clone https://github.com/your-repo/network-automation.git
   cd network-automation

   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install Python dependencies
   pip install -r requirements.txt

   # Set up database (using Docker)
   docker run --name netauto-db -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=network_automation -p 3306:3306 -d mysql:8.0

   # Configure database settings
   # Edit settings.py to use Docker database
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'network_automation',
           'USER': 'root',
           'PASSWORD': 'root',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }

   # Run migrations
   python manage.py migrate

   # Create superuser
   python manage.py createsuperuser

   # Start Redis for Celery
   docker run --name netauto-redis -p 6379:6379 -d redis:6

   # Start backend
   python manage.py runserver

   # In another terminal, start Celery
   celery -A network_automation worker --loglevel=info

   # Set up frontend
   cd frontend
   npm install
   npm run dev
   ```

3. **Environment Variables**
   ```env
   # .env file
   DJANGO_SECRET_KEY=your-secret-key
   DJANGO_DEBUG=True
   DATABASE_URL=mysql://root:root@localhost:3306/network_automation
   CELERY_BROKER_URL=redis://localhost:6379/0
   CORS_ALLOW_ORIGIN=http://localhost:3000
   ```

## Testing Strategy

### Testing Framework

```python
# tests.py - Example test structure

from django.test import TestCase, Client
from django.urls import reverse
from .models import Device, Workflow, User
import json

class DeviceAPITestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')

        # Create test device
        self.device_data = {
            'name': 'Test Router',
            'hostname': 'router1.example.com',
            'ip_address': '192.168.1.1',
            'username': 'admin',
            'password': 'password123',
            'device_type': 'router'
        }

    def test_create_device(self):
        """Test device creation API"""
        response = self.client.post(
            reverse('device_create'),
            data=json.dumps(self.device_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.json())
        self.assertEqual(response.json()['message'], 'Device created successfully')

        # Verify device was created
        device = Device.objects.get(name='Test Router')
        self.assertEqual(device.hostname, 'router1.example.com')

    def test_list_devices(self):
        """Test device listing API"""
        # Create a device first
        Device.objects.create(
            name='Test Device',
            hostname='device1.example.com',
            ip_address='192.168.1.2',
            username='admin',
            password='password123',
            created_by=self.user
        )

        response = self.client.get(reverse('device_list'))

        self.assertEqual(response.status_code, 200)
        self.assertIn('devices', response.json())
        self.assertEqual(len(response.json()['devices']), 1)
        self.assertEqual(response.json()['devices'][0]['name'], 'Test Device')

    def test_device_validation(self):
        """Test device creation validation"""
        # Missing required fields
        invalid_data = {
            'name': 'Incomplete Device'
            # Missing hostname, ip_address, etc.
        }

        response = self.client.post(
            reverse('device_create'),
            data=json.dumps(invalid_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())
```

### Test Coverage Areas

1. **Unit Tests**
   - Model validation
   - Utility functions
   - Serialization/deserialization

2. **Integration Tests**
   - API endpoints
   - Database interactions
   - Authentication flow

3. **End-to-End Tests**
   - Workflow execution
   - Webhook notifications
   - SSH command execution

4. **Performance Tests**
   - API response times
   - Concurrent workflow execution
   - Database query optimization

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific test module
python manage.py test automation.tests.test_api

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

## Performance Optimization

### Database Optimization

```python
# Query optimization examples

# Use select_related for foreign key relationships
def get_workflow_with_executions(workflow_id):
    workflow = Workflow.objects.select_related('created_by').get(id=workflow_id)
    executions = WorkflowExecution.objects.filter(workflow=workflow).select_related('device', 'created_by')
    return workflow, executions

# Use prefetch_related for many-to-many
def get_device_with_executions(device_id):
    device = Device.objects.prefetch_related('workflowexecution_set').get(id=device_id)
    return device

# Use only() and defer() for large models
def get_device_summary(device_id):
    device = Device.objects.only('name', 'ip_address', 'status').get(id=device_id)
    return device

# Bulk operations
def update_device_status(devices, new_status):
    Device.objects.filter(id__in=devices).update(status=new_status)
```

### Caching Strategies

```python
# views.py - Caching examples

from django.core.cache import cache

def get_cached_devices():
    cache_key = 'all_devices_list'
    devices = cache.get(cache_key)

    if devices is None:
        devices = list(Device.objects.all().values('id', 'name', 'ip_address', 'status'))
        cache.set(cache_key, devices, timeout=300)  # 5 minutes

    return devices

def get_cached_device_grouping():
    cache_key = 'device_grouping'
    grouping = cache.get(cache_key)

    if grouping is None:
        # Complex grouping logic
        grouping = perform_device_grouping()
        cache.set(cache_key, grouping, timeout=600)  # 10 minutes

    return grouping
```

### API Performance

```python
# Pagination optimization

def get_paginated_executions(request):
    executions = WorkflowExecution.objects.all()

    # Apply filters
    status = request.GET.get('status')
    if status:
        executions = executions.filter(status=status)

    # Use efficient pagination
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))

    # Use Django's efficient pagination
    paginator = Paginator(executions, per_page)
    page_obj = paginator.get_page(page)

    # Use values() to reduce data transfer
    execution_list = list(page_obj.object_list.values(
        'id', 'workflow__name', 'device__name', 'status', 'created_at'
    ))

    return {
        'executions': execution_list,
        'total': paginator.count,
        'page': page,
        'per_page': per_page
    }
```

## Security Considerations

### Security Best Practices

```python
# settings.py - Security settings

# Security settings for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
REFERRER_POLICY = 'same-origin'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Session security
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
```

### Credential Management

```python
# Secure credential handling

# Use environment variables for sensitive data
import os
from django.conf import settings

def get_device_credentials(device):
    """Get device credentials securely"""
    # In production, consider using a secrets manager
    return {
        'username': device.username,
        'password': device.password,
        'enable_password': device.enable_password
    }

# For SSH connections, use paramiko with proper key management
def create_ssh_connection(device):
    """Create secure SSH connection"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.WarningPolicy())

    # Use key-based auth if available, fall back to password
    try:
        ssh.connect(
            hostname=device.ip_address,
            port=device.ssh_port,
            username=device.username,
            password=device.password,
            timeout=10,
            look_for_keys=True,
            allow_agent=True
        )
    except paramiko.SSHException:
        # Fallback to password-only if key auth fails
        ssh.connect(
            hostname=device.ip_address,
            port=device.ssh_port,
            username=device.username,
            password=device.password,
            timeout=10
        )

    return ssh
```

### Input Validation

```python
# Input validation examples

def validate_workflow_commands(commands):
    """Validate workflow commands for security"""
    dangerous_patterns = [
        'rm -rf',
        'dd ',
        'mkfs',
        'fdisk',
        'format',
        'shutdown',
        'reboot',
        'kill -9',
        'chmod 777',
        'wget ',
        'curl ',
        'scp ',
        'ssh ',
        'nc ',
        'netcat '
    ]

    for cmd in commands:
        cmd_text = cmd if isinstance(cmd, str) else cmd.get('command', '')

        for pattern in dangerous_patterns:
            if pattern in cmd_text.lower():
                raise ValidationError(
                    f"Dangerous command detected: {cmd_text}"
                )

        # Check command length
        if len(cmd_text) > 1000:
            raise ValidationError(
                f"Command too long: {cmd_text[:50]}..."
            )

def validate_webhook_url(url):
    """Validate webhook URL for security"""
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)

        # Check for internal IPs
        if parsed.hostname in ['localhost', '127.0.0.1', '::1']:
            raise ValidationError("Webhook URL cannot be localhost")

        # Check for valid scheme
        if parsed.scheme not in ['http', 'https']:
            raise ValidationError("Webhook URL must use http or https")

        # Check for valid port
        if parsed.port and parsed.port not in [80, 443]:
            # Allow custom ports but log warning
            pass

    except Exception as e:
        raise ValidationError(f"Invalid webhook URL: {str(e)}")
```

## Conclusion

This technical documentation provides comprehensive details about the Network Automation Tool's implementation, covering architecture, code structure, best practices, and deployment considerations. Developers should refer to this guide for understanding the system's technical aspects and for implementing extensions or modifications.

For additional technical details, refer to the source code comments and Django/React documentation.