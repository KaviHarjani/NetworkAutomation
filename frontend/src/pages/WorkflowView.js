import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  PlayIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import StatusBadge from '../components/StatusBadge';
import { workflowAPI } from '../services/api';
import toast from 'react-hot-toast';

const WorkflowView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showApiExample, setShowApiExample] = useState(false);
  const [apiExample, setApiExample] = useState(null);
  const [loadingApiExample, setLoadingApiExample] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Delete mutation
  const deleteMutation = useMutation(
    () => workflowAPI.deleteWorkflow(id),
    {
      onSuccess: () => {
        toast.success('Workflow deleted successfully');
        queryClient.invalidateQueries(['workflows']);
        navigate('/workflows');
      },
      onError: (error) => {
        toast.error('Failed to delete workflow: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  // Fetch workflow details
  const { data, isLoading, error } = useQuery(
    ['workflow', id],
    () => workflowAPI.getWorkflow(id),
    {
      refetchOnWindowFocus: false,
    }
  );

  const workflow = data?.data;

  const fetchApiExample = async () => {
    try {
      setLoadingApiExample(true);
      const response = await workflowAPI.getWorkflowExampleApiBody(id);
      setApiExample(response.data);
      setShowApiExample(true);
    } catch (error) {
      toast.error('Failed to fetch API example: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingApiExample(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !workflow) {
    toast.error('Failed to load workflow details');
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow not found</h3>
        <p className="text-gray-500 mb-4">The workflow you're looking for doesn't exist.</p>
        <Link
          to="/workflows"
          className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg inline-flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Workflows
        </Link>
      </div>
    );
  }

  const renderCommandSection = (title, commands, bgColor) => {
    if (!commands || !Array.isArray(commands) || commands.length === 0) return null;

    return (
      <div className={`${bgColor} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {commands.map((command, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Command {index + 1}</span>
              </div>
              <div className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded border">
                {command?.command || command || 'No command specified'}
              </div>
              {command?.description && (
                <p className="text-sm text-gray-600 mt-2">{command.description}</p>
              )}
              {command?.validation && (
                <div className="mt-2 text-xs text-gray-500">
                  <div>Expected Pattern: {command.validation.output_pattern || 'Any'}</div>
                  <div>Exit Code: {command.validation.expected_exit_code || 'Any'}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/workflows"
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
            <div className="flex items-center mt-2 space-x-4">
              <StatusBadge status={workflow.status} type="workflow" />
              <div className="flex items-center text-sm text-gray-500">
                <UserIcon className="h-4 w-4 mr-1" />
                Created by {workflow.created_by}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="h-4 w-4 mr-1" />
                {new Date(workflow.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Link
            to={`/workflows/${workflow.id}/edit`}
            className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </Link>
          <Link
            to={`/workflows/execute?workflow=${workflow.id}`}
            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Execute
          </Link>
          {workflow.required_dynamic_params && workflow.required_dynamic_params.length > 0 && (
            <button
              onClick={fetchApiExample}
              disabled={loadingApiExample}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center disabled:opacity-50"
            >
              <CodeBracketIcon className="h-5 w-5 mr-2" />
              {loadingApiExample ? 'Loading...' : 'API Example'}
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700">{workflow.description}</p>
        </div>
      )}

      {/* Command Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-blue-600">
            {workflow.command_counts?.pre_check || 0}
          </div>
          <div className="text-sm text-gray-600">Pre-check Commands</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-green-600">
            {workflow.command_counts?.implementation || 0}
          </div>
          <div className="text-sm text-gray-600">Implementation Commands</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-purple-600">
            {workflow.command_counts?.post_check || 0}
          </div>
          <div className="text-sm text-gray-600">Post-check Commands</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-orange-600">
            {workflow.command_counts?.rollback || 0}
          </div>
          <div className="text-sm text-gray-600">Rollback Commands</div>
        </div>
      </div>

      {/* Command Sections */}
      <div className="space-y-6">
        {renderCommandSection('Pre-check Commands', workflow.pre_check_commands, 'bg-blue-50')}
        {renderCommandSection('Implementation Commands', workflow.implementation_commands, 'bg-green-50')}
        {renderCommandSection('Post-check Commands', workflow.post_check_commands, 'bg-purple-50')}
        {renderCommandSection('Rollback Commands', workflow.rollback_commands, 'bg-orange-50')}
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Workflow ID</label>
            <div className="text-sm text-gray-900">{workflow.id}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <StatusBadge status={workflow.status} type="workflow" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <div className="text-sm text-gray-900">
              {new Date(workflow.created_at).toLocaleString()}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Updated</label>
            <div className="text-sm text-gray-900">
              {new Date(workflow.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* API Example Modal */}
      {showApiExample && apiExample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">API Example for {apiExample.workflow_name}</h3>
                <button
                  onClick={() => setShowApiExample(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Use this example to trigger the workflow via API with required dynamic parameters
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {apiExample.has_dynamic_params ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Required Dynamic Parameters</h4>
                    <p className="text-sm text-yellow-600">
                      This workflow requires the following dynamic parameters:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
                      {apiExample.required_dynamic_params.map((param, index) => (
                        <li key={index}>{param}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800">No Dynamic Parameters Required</h4>
                    <p className="text-sm text-green-600">
                      This workflow can be executed without additional parameters
                    </p>
                  </div>
                )}
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Example API Request Body</h4>
                  <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(apiExample.example_api_body, null, 2)}</pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Replace DEVICE_ID_HERE with the actual device ID and adjust parameter values as needed
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">API Endpoint</h4>
                  <div className="bg-blue-100 text-blue-800 rounded p-3 font-mono text-sm break-all">
                    POST /api/workflows/execute/
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Send the request to this endpoint with the JSON body shown above
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowApiExample(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Delete Workflow</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "{workflow.name}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowView;