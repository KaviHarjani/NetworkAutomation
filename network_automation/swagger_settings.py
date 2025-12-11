# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

# drf-spectacular settings for Swagger documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'Network Automation API',
    'DESCRIPTION': '''
    # 🚀 Network Automation API

    Modern, comprehensive API for managing network devices, workflows, and automated configurations.

    ## 🔐 Authentication

    The API uses Django session authentication. Users must log in through the `/api/auth/login/` endpoint
    to obtain a session cookie for authenticated requests.

    ## ✨ Features

    - **🖥️ Device Management**: Create, update, and manage network devices
    - **🔄 Workflow Management**: Define and manage automation workflows
    - **⚡ Execution Tracking**: Monitor workflow execution status and results
    - **📝 System Logging**: View system activity and audit logs

    ## 📊 API Status

    - **Version**: 1.0.0
    - **Environment**: Development
    - **Rate Limiting**: Enabled to prevent abuse
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,

    # Modern UI settings
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'displayOperationId': True,
        'defaultModelsExpandDepth': 1,
        'defaultModelExpandDepth': 1,
        'docExpansion': 'list',
        'filter': True,
        'persistAuthorization': True,
        'displayRequestDuration': True,
        'tryItOutEnabled': True,
        'syntaxHighlight': {
            'activated': True,
            'theme': 'monokai'
        },
        'theme': {
            'name': 'modern',
            'colors': {
                'primary': {
                    'main': '#3b82f6',  # Blue 500
                    'contrastText': '#ffffff'
                },
                'secondary': {
                    'main': '#10b981',  # Emerald 500
                    'contrastText': '#ffffff'
                },
                'background': {
                    'default': '#f8fafc',  # Slate 50
                    'paper': '#ffffff'
                },
                'text': {
                    'primary': '#1e293b',  # Slate 800
                    'secondary': '#64748b'  # Slate 500
                }
            }
        }
    },

    # Component generation settings
    'COMPONENT_SPLIT_REQUEST': True,
    'COMPONENT_SPLIT_RESPONSE': True,

    # Schema generation settings
    'SCHEMA_PATH_PREFIX': r'/api/',
    'SCHEMA_PATH_PREFIX_TRIM': True,

    # Post processing hooks
    'POSTPROCESSING_HOOKS': [
        'drf_spectacular.hooks.postprocess_schema_enums',
    ],

    # Operation sorting
    'OPERATION_SORTER': 'method',
    'TAG_SORTER': 'alpha',

    # Field expansion
    'EXPAND_POLYMORPHIC': True,
    'EXPAND_INLINE_SCHEMA_COMPONENTS': True,

    # Validation settings
    'ENUM_NAME_OVERRIDES': {
        'DeviceTypeEnum': 'automation.models.Device.DEVICE_TYPES',
        'WorkflowStatusEnum': 'automation.models.Workflow.STATUS_CHOICES',
        'ExecutionStatusEnum': 'automation.models.WorkflowExecution.STATUS_CHOICES',
        'LogLevelEnum': 'automation.models.SystemLog.LEVEL_CHOICES',
        'LogTypeEnum': 'automation.models.SystemLog.TYPE_CHOICES',
    },

    # Custom settings
    'SORT_OPERATIONS': True,
    'APPEND_COMPONENTS': {
        'schemas': {
            'ErrorResponse': {
                'type': 'object',
                'properties': {
                    'error': {
                        'type': 'string',
                        'description': 'Error message describing what went wrong'
                    }
                },
                'required': ['error']
            },
            'PaginationInfo': {
                'type': 'object',
                'properties': {
                    'total': {
                        'type': 'integer',
                        'description': 'Total number of items available'
                    },
                    'page': {
                        'type': 'integer',
                        'description': 'Current page number'
                    },
                    'per_page': {
                        'type': 'integer',
                        'description': 'Number of items per page'
                    },
                    'has_next': {
                        'type': 'boolean',
                        'description': 'Whether there are more items on the next page'
                    },
                    'has_previous': {
                        'type': 'boolean',
                        'description': 'Whether there are items on the previous page'
                    }
                },
                'required': ['total', 'page', 'per_page', 'has_next', 'has_previous']
            },
            'MessageResponse': {
                'type': 'object',
                'properties': {
                    'id': {
                        'type': 'string',
                        'description': 'ID of the created/updated resource'
                    },
                    'message': {
                        'type': 'string',
                        'description': 'Success message'
                    }
                },
                'required': ['message']
            }
        }
    },

    # Modern API documentation enhancements
    'TOS': 'https://example.com/terms',
    'CONTACT': {
        'name': 'API Support',
        'url': 'https://example.com/support',
        'email': 'support@example.com'
    },
    'LICENSE': {
        'name': 'MIT License',
        'url': 'https://opensource.org/licenses/MIT'
    },
    'EXTERNAL_DOCS': {
        'description': 'Find out more about Network Automation',
        'url': 'https://example.com/docs'
    }
}