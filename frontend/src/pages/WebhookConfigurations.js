import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { webhookAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const WebhookConfigurations = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    description: '',
    webhook_url: '',
    events: 'execution_completed',
    method: 'POST',
    is_active: true,
    secret_key: ''
  });

  const queryClient = useQueryClient();

  // Fetch webhooks
  const { data: webhooks, isLoading, error } = useQuery('webhooks', webhookAPI.getWebhooks);

  // Create webhook mutation
  const createMutation = useMutation(webhookAPI.createWebhook, {
    onSuccess: () => {
      queryClient.invalidateQueries('webhooks');
      setShowCreateModal(false);
      setNewWebhook({
        name: '',
        description: '',
        webhook_url: '',
        events: 'execution_completed',
        method: 'POST',
        is_active: true,
        secret_key: ''
      });
      toast.success('Webhook created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create webhook: ${error.response?.data?.error || error.message}`);
    }
  });

  // Update webhook mutation
  const updateMutation = useMutation(
    (data) => webhookAPI.updateWebhook(data.id, data.webhookData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('webhooks');
        setShowEditModal(false);
        setEditingWebhook(null);
        toast.success('Webhook updated successfully');
      },
      onError: (error) => {
        toast.error(`Failed to update webhook: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Delete webhook mutation
  const deleteMutation = useMutation(
    (webhookId) => webhookAPI.deleteWebhook(webhookId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('webhooks');
        toast.success('Webhook deleted successfully');
      },
      onError: (error) => {
        toast.error(`Failed to delete webhook: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Test webhook mutation
  const testMutation = useMutation(
    (webhookId) => webhookAPI.testWebhook(webhookId),
    {
      onSuccess: (result) => {
        setTestResult(result.data);
      },
      onError: (error) => {
        setTestResult({
          success: false,
          message: error.response?.data?.error || error.message
        });
      }
    }
  );

  const handleCreateWebhook = (e) => {
    e.preventDefault();
    createMutation.mutate(newWebhook);
  };

  const handleUpdateWebhook = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editingWebhook.id,
      webhookData: editingWebhook
    });
  };

  const handleDeleteWebhook = (webhookId) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      deleteMutation.mutate(webhookId);
    }
  };

  const handleTestWebhook = (webhookId) => {
    setTestResult(null);
    testMutation.mutate(webhookId);
  };

  const openEditModal = (webhook) => {
    setEditingWebhook({ ...webhook });
    setShowEditModal(true);
  };

  const getEventLabel = (eventType) => {
    const eventLabels = {
      'execution_completed': 'Execution Completed',
      'execution_failed': 'Execution Failed',
      'execution_started': 'Execution Started',
      'all_events': 'All Events'
    };
    return eventLabels[eventType] || eventType;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Failed to load webhooks: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Webhook Configurations</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Webhook</span>
        </button>
      </div>

      {webhooks?.data?.webhooks?.length === 0 ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                No webhook configurations found. Create your first webhook to get started.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {webhooks?.data?.webhooks?.map((webhook) => (
                <tr key={webhook.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{webhook.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{webhook.webhook_url}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {getEventLabel(webhook.events)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      webhook.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Test webhook"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(webhook)}
                      className="text-yellow-600 hover:text-yellow-900"
                      title="Edit webhook"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete webhook"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Webhook</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newWebhook.description}
                  onChange={(e) => setNewWebhook({...newWebhook, description: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  rows="3"
                />
              </div>

              <div>
                <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <input
                  type="url"
                  id="webhook_url"
                  value={newWebhook.webhook_url}
                  onChange={(e) => setNewWebhook({...newWebhook, webhook_url: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="events" className="block text-sm font-medium text-gray-700">
                  Trigger Events
                </label>
                <select
                  id="events"
                  value={newWebhook.events}
                  onChange={(e) => setNewWebhook({...newWebhook, events: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="execution_completed">Execution Completed</option>
                  <option value="execution_failed">Execution Failed</option>
                  <option value="execution_started">Execution Started</option>
                  <option value="all_events">All Events</option>
                </select>
              </div>

              <div>
                <label htmlFor="method" className="block text-sm font-medium text-gray-700">
                  HTTP Method
                </label>
                <select
                  id="method"
                  value={newWebhook.method}
                  onChange={(e) => setNewWebhook({...newWebhook, method: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>

              <div>
                <label htmlFor="secret_key" className="block text-sm font-medium text-gray-700">
                  Secret Key (Optional)
                </label>
                <input
                  type="text"
                  id="secret_key"
                  value={newWebhook.secret_key}
                  onChange={(e) => setNewWebhook({...newWebhook, secret_key: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newWebhook.is_active}
                  onChange={(e) => setNewWebhook({...newWebhook, is_active: e.target.checked})}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {createMutation.isLoading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin inline-block mr-2" />
                      Creating...
                    </>
                  ) : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Webhook Modal */}
      {showEditModal && editingWebhook && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Webhook</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateWebhook} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editingWebhook.name}
                  onChange={(e) => setEditingWebhook({...editingWebhook, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editingWebhook.description}
                  onChange={(e) => setEditingWebhook({...editingWebhook, description: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  rows="3"
                />
              </div>

              <div>
                <label htmlFor="edit-webhook_url" className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <input
                  type="url"
                  id="edit-webhook_url"
                  value={editingWebhook.webhook_url}
                  onChange={(e) => setEditingWebhook({...editingWebhook, webhook_url: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-events" className="block text-sm font-medium text-gray-700">
                  Trigger Events
                </label>
                <select
                  id="edit-events"
                  value={editingWebhook.events}
                  onChange={(e) => setEditingWebhook({...editingWebhook, events: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="execution_completed">Execution Completed</option>
                  <option value="execution_failed">Execution Failed</option>
                  <option value="execution_started">Execution Started</option>
                  <option value="all_events">All Events</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-method" className="block text-sm font-medium text-gray-700">
                  HTTP Method
                </label>
                <select
                  id="edit-method"
                  value={editingWebhook.method}
                  onChange={(e) => setEditingWebhook({...editingWebhook, method: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-secret_key" className="block text-sm font-medium text-gray-700">
                  Secret Key (Optional)
                </label>
                <input
                  type="text"
                  id="edit-secret_key"
                  value={editingWebhook.secret_key}
                  onChange={(e) => setEditingWebhook({...editingWebhook, secret_key: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={editingWebhook.is_active}
                  onChange={(e) => setEditingWebhook({...editingWebhook, is_active: e.target.checked})}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {updateMutation.isLoading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin inline-block mr-2" />
                      Updating...
                    </>
                  ) : 'Update Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Webhook Modal */}
      {testResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Webhook Test Result</h3>
              <button
                onClick={() => setTestResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {testResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setTestResult(null)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookConfigurations;