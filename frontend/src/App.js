import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Components
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Workflows from './pages/Workflows';
import Executions from './pages/Executions';
import ExecutionDetail from './pages/ExecutionDetail';
import CreateDevice from './pages/CreateDevice';
import CreateWorkflow from './pages/CreateWorkflow';
import DeviceView from './pages/DeviceView';
import DeviceEdit from './pages/DeviceEdit';
import EnhancedCreateWorkflow from './pages/EnhancedCreateWorkflow';
import ExecuteWorkflow from './pages/ExecuteWorkflow';
import WorkflowView from './pages/WorkflowView';
import WorkflowEdit from './pages/WorkflowEdit';
import Logs from './pages/Logs';
import DeviceMapping from './pages/DeviceMapping';
import WebhookConfigurations from './pages/WebhookConfigurations';
import AnsibleWorkflows from './pages/AnsibleWorkflows';
import AnsiblePlaybookCreate from './pages/AnsiblePlaybookCreate';
import AnsiblePlaybookView from './pages/AnsiblePlaybookView';
import AnsiblePlaybookEdit from './pages/AnsiblePlaybookEdit';
import AnsibleInventoryCreate from './pages/AnsibleInventoryCreate';
import AnsibleInventoryView from './pages/AnsibleInventoryView';
import AnsibleInventoryEdit from './pages/AnsibleInventoryEdit';
import AnsibleAutomationHelper from './pages/AnsibleAutomationHelper';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// API
import api from './services/api';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Network Automation Tool</h2>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/devices/create" element={<CreateDevice />} />
        <Route path="/devices/:id" element={<DeviceView />} />
        <Route path="/devices/:id/edit" element={<DeviceEdit />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/workflows/create" element={<CreateWorkflow />} />
        <Route path="/workflows/create/enhanced" element={<EnhancedCreateWorkflow />} />
        <Route path="/workflows/:id" element={<WorkflowView />} />
        <Route path="/workflows/:id/edit" element={<WorkflowEdit />} />
        <Route path="/workflows/execute" element={<ExecuteWorkflow />} />
        <Route path="/ansible-workflows" element={<AnsibleWorkflows />} />
        <Route path="/ansible-playbook-create" element={<AnsiblePlaybookCreate />} />
        <Route path="/ansible-playbook-view/:id" element={<AnsiblePlaybookView />} />
        <Route path="/ansible-playbook-edit/:id" element={<AnsiblePlaybookEdit />} />
        <Route path="/ansible-inventory-create" element={<AnsibleInventoryCreate />} />
        <Route path="/ansible-inventory-view/:id" element={<AnsibleInventoryView />} />
        <Route path="/ansible-inventory-edit/:id" element={<AnsibleInventoryEdit />} />
        <Route path="/ansible-helper" element={<AnsibleAutomationHelper />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/executions/:id" element={<ExecutionDetail />} />
        <Route path="/ansible-execution-detail/:id" element={<ExecutionDetail />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/device-mapping" element={<DeviceMapping />} />
        <Route path="/webhooks" element={<WebhookConfigurations />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
