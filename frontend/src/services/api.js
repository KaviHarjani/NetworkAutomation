import axios from 'axios';
import toast from 'react-hot-toast';

// Helper function to get cookie value for CSRF token
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  console.log('API: getCookie result for', name + ':', cookieValue ? 'found (length: ' + cookieValue.length + ')' : 'not found');
  return cookieValue;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for session authentication
});

// Request interceptor to add CSRF token and handle authentication
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for Django session-based authentication
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
      config.headers['X-CSRFToken'] = csrftoken;
      console.log('API: Added CSRF token to request:', {
        url: config.url,
        method: config.method,
        hasToken: !!csrftoken
      });
    } else {
      console.warn('API: No CSRF token found in cookies for request:', {
        url: config.url,
        method: config.method,
        allCookies: document.cookie ? 'cookies present' : 'no cookies'
      });
    }
    return config;
  },
  (error) => {
    console.error('API: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors - DISABLED REDIRECT FOR TESTING
api.interceptors.response.use(
  (response) => {
    console.log('API: Successful response:', {
      url: response.config?.url,
      status: response.status,
      method: response.config?.method
    });
    return response;
  },
  (error) => {
    console.log('API: Error Interceptor triggered:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      pathname: window.location.pathname,
      errorMessage: error.message,
      responseData: error.response?.data
    });

    if (error.response?.status === 403) {
      // CSRF verification failed
      console.error('API: CSRF verification failed (403) for:', {
        url: error.config?.url,
        method: error.config?.method,
        hasCsrfHeader: !!error.config?.headers['X-CSRFToken']
      });

      // If this is not already a CSRF token request, try to refresh the token
      if (!error.config.url.includes('/csrf-token/')) {
        console.log('API: Attempting to refresh CSRF token due to 403 error...');
        return authAPI.getCsrfToken()
          .then((csrfResponse) => {
            console.log('API: CSRF token refreshed successfully:', csrfResponse.data);
            // Retry the original request
            const csrftoken = getCookie('csrftoken');
            if (csrftoken) {
              error.config.headers['X-CSRFToken'] = csrftoken;
              console.log('API: Retrying original request with new CSRF token');
              return api.request(error.config);
            } else {
              console.error('API: No CSRF token found after refresh, cannot retry');
              throw error;
            }
          })
          .catch((refreshError) => {
            console.error('API: CSRF token refresh failed:', refreshError);
            // If CSRF refresh fails, show error message
            toast.error('Session expired. Please refresh the page and try again.');
            throw error;
          });
      } else {
        console.log('API: 403 error on CSRF token endpoint itself, not retrying');
      }
    } else if (error.response?.status === 401) {
      // TEMPORARILY DISABLED - Don't redirect for auth endpoints
      // Only redirect to login if not already on login page and not during auth check
      const isAuthEndpoint = error.config.url.includes('/api/auth/');
      const isLoginPage = window.location.pathname === '/login';

      console.log('API: 401 error - Auth check:', { isAuthEndpoint, isLoginPage, url: error.config?.url });

      // Don't redirect if we're already on login page or checking authentication
      if (!isLoginPage && !isAuthEndpoint) {
        console.log('API: Redirecting to login due to 401...');
        // Unauthorized - redirect to login for protected routes
        window.location.href = '/login';
      } else {
        console.log('API: Skipping redirect for 401 error');
      }
    } else if (error.response?.status >= 500) {
      // Server error
      console.log('API: Server error (>=500), showing toast');
      toast.error('Server error. Please try again later.');
    } else if (error.message === 'Network Error') {
      console.log('API: Network error, showing toast');
      toast.error('Network error. Please check your connection.');
    } else {
      console.log('API: Unhandled error type:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  getCsrfToken: () =>
    api.get('/api/auth/csrf-token/'),
  
  login: (username, password) =>
    api.post('/api/auth/login/', { username, password }),
  
  logout: () =>
    api.post('/api/auth/logout/'),
  
  getUser: () =>
    api.get('/api/auth/user/'),
};

// Device API
export const deviceAPI = {
  getDevices: (params = {}) =>
    api.get('/api/devices/', { params }),
  
  createDevice: (deviceData) =>
    api.post('/api/devices/', deviceData),
  
  updateDevice: (deviceId, deviceData) =>
    api.put(`/api/devices/${deviceId}/`, deviceData),
  
  deleteDevice: (deviceId) =>
    api.delete(`/api/devices/${deviceId}/`),
  
  getDevice: (deviceId) =>
    api.get(`/api/devices/${deviceId}/`),

  getDeviceGroupings: () =>
    api.get('/api/devices/groupings/'),

  assignWorkflowToGroup: (workflowId, deviceIds) =>
    api.post('/api/devices/assign-workflow/', { workflow_id: workflowId, device_ids: deviceIds }),

  assignPlaybookToGroup: (playbookId, deviceIds) =>
    api.post('/api/devices/assign-playbook/', { playbook_id: playbookId, device_ids: deviceIds }),

  generateGroupInventory: (deviceIds, groupName) =>
    api.post('/api/devices/generate-inventory/', { device_ids: deviceIds, group_name: groupName }),

  getMappings: () =>
    api.get('/api/automation/mappings/'),

  createMapping: (mappingData) =>
    api.post('/api/automation/mappings/', mappingData),

  updateMapping: (mappingId, mappingData) =>
    api.put(`/api/automation/mappings/${mappingId}/`, mappingData),

  deleteMapping: (mappingId) =>
    api.delete(`/api/automation/mappings/${mappingId}/`),

  executeWorkflow: (executionData) =>
    api.post('/api/executions/execute/', executionData),

  // Generic automation endpoint
  executeGenericAutomation: (automationData) =>
    api.post('/api/automation/generic/', automationData),
};

// Workflow API
export const workflowAPI = {
  getWorkflows: () =>
    api.get('/api/workflows/'),
  
  createWorkflow: (workflowData) =>
    api.post('/api/workflows/', workflowData),
  
  updateWorkflow: (workflowId, workflowData) =>
    api.put(`/api/workflows/${workflowId}/`, workflowData),
  
  deleteWorkflow: (workflowId) =>
    api.delete(`/api/workflows/${workflowId}/delete/`),
  
  getWorkflow: (workflowId) =>
    api.get(`/api/workflows/${workflowId}/`),
  
  getWorkflowExampleApiBody: (workflowId) =>
    api.get(`/api/workflows/${workflowId}/example_api_body/`),
  
  executeWorkflow: (executionData) =>
    api.post('/api/executions/execute/', executionData),
};

// Execution API
export const executionAPI = {
  getExecutions: (params = {}) =>
    api.get('/api/executions/', { params }),
  
  getUnifiedExecutions: (params = {}) =>
    api.get('/api/executions/unified/', { params }),
  
  getUnifiedExecutionDetail: (executionId) =>
    api.get(`/api/executions/unified/${executionId}/`),
  
  getExecution: (executionId) =>
    api.get(`/api/executions/${executionId}/`),
  
  cancelExecution: (executionId) =>
    api.post(`/api/executions/${executionId}/cancel/`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () =>
    api.get('/api/dashboard/stats/'),
  
  getRecentExecutions: (limit = 10) =>
    api.get('/api/executions/unified/', { params: { per_page: limit } }),
  
  getExecutionStats: (days = 30) =>
    api.get('/api/dashboard/execution-stats/', { params: { days } }),
  
  getDeviceStatusCounts: () =>
    api.get('/api/dashboard/device-status/'),
};

// Health API
export const healthAPI = {
  getCeleryHealth: () =>
    api.get('/api/health/celery/'),
};

// Logs API
export const logsAPI = {
  getLogs: (params = {}) =>
    api.get('/api/logs/', { params }),
  
  getLog: (logId) =>
    api.get(`/api/logs/${logId}/`),
};

// Unified Logs API
export const unifiedLogsAPI = {
  getUnifiedLogs: (params = {}) =>
    api.get('/api/unified-logs/', { params }),
  
  getLogTypes: () =>
    api.get('/api/unified-logs/log-types/'),
  
  getDevices: () =>
    api.get('/api/unified-logs/devices/'),
  
  getExecutionLogs: (executionId, executionType) =>
    api.get('/api/unified-logs/execution_logs/', { 
      params: { execution_id: executionId, execution_type: executionType } 
    }),
  
  getExecutions: (params = {}) =>
    api.get('/api/unified-logs/executions/', { params }),
};


// Webhook API
export const webhookAPI = {
  getWebhooks: () =>
    api.get('/api/webhooks/'),

  createWebhook: (webhookData) =>
    api.post('/api/webhooks/create/', webhookData),

  updateWebhook: (webhookId, webhookData) =>
    api.put(`/api/webhooks/${webhookId}/update/`, webhookData),

  deleteWebhook: (webhookId) =>
    api.delete(`/api/webhooks/${webhookId}/delete/`),

  getWebhook: (webhookId) =>
    api.get(`/api/webhooks/${webhookId}/`),

  testWebhook: (webhookId) =>
    api.post(`/api/webhooks/${webhookId}/test/`),
};

// Ansible API
export const ansibleAPI = {
  // Playbook operations
  getPlaybooks: (params = {}) =>
    api.get('/api/ansible-playbooks/', { params }),

  createPlaybook: (playbookData) =>
    api.post('/api/ansible-playbooks/', playbookData),

  updatePlaybook: (playbookId, playbookData) =>
    api.put(`/api/ansible-playbooks/${playbookId}/`, playbookData),

  deletePlaybook: (playbookId) =>
    api.delete(`/api/ansible-playbooks/${playbookId}/`),

  getPlaybook: (playbookId) =>
    api.get(`/api/ansible-playbooks/${playbookId}/`),

  validatePlaybook: (playbookContent) =>
    api.post('/api/ansible-playbooks/validate/', { playbook_content: playbookContent }),

  // Export operations
  exportPlaybook: (playbookId) =>
    api.get(`/api/ansible-playbooks/${playbookId}/export/`, {
      responseType: 'blob',
    }),

  exportAllPlaybooks: () =>
    api.get('/api/ansible-playbooks/export_all/', {
      responseType: 'blob',
    }),

  // Inventory operations
  getInventories: (params = {}) =>
    api.get('/api/ansible-inventories/', { params }),

  createInventory: (inventoryData) =>
    api.post('/api/ansible-inventories/', {
      name: inventoryData.name,
      description: inventoryData.description,
      inventory_type: inventoryData.inventory_type,
      inventory_content: inventoryData.inventory_content,
      group_variables_dict: inventoryData.group_variables_dict || {},
      host_variables_dict: inventoryData.host_variables_dict || {}
    }),

  updateInventory: (inventoryId, inventoryData) =>
    api.put(`/api/ansible-inventories/${inventoryId}/`, {
      name: inventoryData.name,
      description: inventoryData.description,
      inventory_type: inventoryData.inventory_type,
      inventory_content: inventoryData.inventory_content,
      group_variables_dict: inventoryData.group_variables_dict || {},
      host_variables_dict: inventoryData.host_variables_dict || {}
    }),

  deleteInventory: (inventoryId) =>
    api.delete(`/api/ansible-inventories/${inventoryId}/`),

  getInventory: (inventoryId) =>
    api.get(`/api/ansible-inventories/${inventoryId}/`),

  validateInventory: (inventoryContent) =>
    api.post('/api/ansible-inventories/validate/', { inventory_content: inventoryContent }),

  // Execution operations
  getExecutions: (params = {}) =>
    api.get('/api/ansible-executions/', { params }),

  getExecution: (executionId) =>
    api.get(`/api/ansible-executions/${executionId}/`),

  executePlaybook: (executionData) =>
    api.post('/api/ansible-executions/execute/', executionData),

  // Auto-discovery operations
  discoverPlaybooks: (directory = null) =>
    api.get('/api/ansible-playbooks/discover/', { params: { directory } }),

  importPlaybooks: (directory = null) =>
    api.post('/api/ansible-playbooks/import_playbooks/', { directory }),

  getPlaybookDirectory: () =>
    api.get('/api/ansible-playbooks/directory_info/'),
};

// Chef API
export const chefAPI = {
  // Cookbook operations
  getCookbooks: (params = {}) =>
    api.get('/api/chef-cookbooks/', { params }),

  createCookbook: (cookbookData) =>
    api.post('/api/chef-cookbooks/', cookbookData),

  updateCookbook: (cookbookId, cookbookData) =>
    api.put(`/api/chef-cookbooks/${cookbookId}/`, cookbookData),

  deleteCookbook: (cookbookId) =>
    api.delete(`/api/chef-cookbooks/${cookbookId}/`),

  getCookbook: (cookbookId) =>
    api.get(`/api/chef-cookbooks/${cookbookId}/`),

  validateCookbook: (cookbookContent) =>
    api.post('/api/chef-cookbooks/validate/', { cookbook_content: cookbookContent }),

  // Recipe operations
  getRecipes: (params = {}) =>
    api.get('/api/chef-recipes/', { params }),

  createRecipe: (recipeData) =>
    api.post('/api/chef-recipes/', recipeData),

  updateRecipe: (recipeId, recipeData) =>
    api.put(`/api/chef-recipes/${recipeId}/`, recipeData),

  deleteRecipe: (recipeId) =>
    api.delete(`/api/chef-recipes/${recipeId}/`),

  getRecipe: (recipeId) =>
    api.get(`/api/chef-recipes/${recipeId}/`),

  validateRecipe: (recipeContent) =>
    api.post('/api/chef-recipes/validate/', { recipe_content: recipeContent }),

  // Execution operations
  getExecutions: (params = {}) =>
    api.get('/api/chef-executions/', { params }),

  getExecution: (executionId) =>
    api.get(`/api/chef-executions/${executionId}/`),

  executeCookbook: (executionData) =>
    api.post('/api/chef-executions/execute/', executionData),

  // Auto-discovery operations
  discoverCookbooks: (directory = null) =>
    api.get('/api/chef-cookbooks/discover/', { params: { directory } }),

  importCookbooks: (directory = null) =>
    api.post('/api/chef-cookbooks/import_cookbooks/', { directory }),

  getCookbookDirectory: () =>
    api.get('/api/chef-cookbooks/directory_info/'),
};

export default api;