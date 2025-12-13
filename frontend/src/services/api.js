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
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors - DISABLED REDIRECT FOR TESTING
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error Interceptor:', {
      url: error.config?.url,
      status: error.response?.status,
      pathname: window.location.pathname
    });
    
    if (error.response?.status === 401) {
      // TEMPORARILY DISABLED - Don't redirect for auth endpoints
      // Only redirect to login if not already on login page and not during auth check
      const isAuthEndpoint = error.config.url.includes('/api/auth/');
      const isLoginPage = window.location.pathname === '/login';
      
      console.log('Auth check:', { isAuthEndpoint, isLoginPage });
      
      // Don't redirect if we're already on login page or checking authentication
      if (!isLoginPage && !isAuthEndpoint) {
        console.log('Redirecting to login...');
        // Unauthorized - redirect to login for protected routes
        window.location.href = '/login';
      } else {
        console.log('Skipping redirect...');
      }
    } else if (error.response?.status >= 500) {
      // Server error
      toast.error('Server error. Please try again later.');
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
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

  executeWorkflow: (executionData) =>
    api.post('/api/executions/execute/', executionData),
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
  
  executeWorkflow: (workflowId, deviceId) =>
    api.post('/api/workflows/execute/', { workflow_id: workflowId, device_id: deviceId }),
};

// Execution API
export const executionAPI = {
  getExecutions: (params = {}) =>
    api.get('/api/executions/', { params }),
  
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
    api.get('/api/executions/', { params: { per_page: limit } }),
  
  getExecutionStats: (days = 30) =>
    api.get('/api/dashboard/execution-stats/', { params: { days } }),
  
  getDeviceStatusCounts: () =>
    api.get('/api/dashboard/device-status/'),
};

// Logs API
export const logsAPI = {
  getLogs: (params = {}) =>
    api.get('/api/logs/', { params }),
  
  getLog: (logId) =>
    api.get(`/api/logs/${logId}/`),
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
export default api;