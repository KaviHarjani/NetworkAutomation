import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ArrowLeftIcon, PlayIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { executionAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ExecutionDetail = () => {
  const { id } = useParams();
  
  // Fetch execution data using unified API
  const { data: rawData, isLoading, error } = useQuery(
    ['unified-execution-detail', id],
    () => executionAPI.getUnifiedExecutionDetail(id),
    {
      retry: false,
      enabled: !!id,
    }
  );
  
  // Handle API response structure (unified API returns data directly)
  const executionData = rawData?.data || rawData;
  
  // Determine execution type from the data
  const isAnsibleExecution = executionData?.type === 'ansible';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    console.error('Execution detail error:', error);
  }
  
  if (error || !executionData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link
            to="/executions"
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Execution Not Found</h1>
            <p className="text-gray-600 mt-1">Execution ID: {id}</p>
            {error && (
              <p className="text-red-500 mt-2 text-sm">Error: {error.message}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-12">
            <XCircleIcon className="h-12 w-12 mx-auto mb-4 text-red-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Execution Not Found</h3>
            <p className="text-gray-500">The requested execution could not be found or you don't have permission to view it.</p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-600">Debug Info</summary>
                <pre className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify({ id, isAnsibleExecution, error: error?.message, executionData }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          to="/executions"
          className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAnsibleExecution ? 'Ansible Execution' : 'Workflow Execution'} Details
          </h1>
          <p className="text-gray-600 mt-1">Execution ID: {id}</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Execution Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <div className="mt-1">
              <StatusBadge status={executionData.status} type="execution" />
            </div>
          </div>
          
          {isAnsibleExecution ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Playbook</label>
                <p className="mt-1 text-sm text-gray-900">{executionData.playbook_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Inventory</label>
                <p className="mt-1 text-sm text-gray-900">{executionData.inventory_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Return Code</label>
                <p className="mt-1 text-sm text-gray-900">{executionData.return_code || 'N/A'}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Workflow</label>
                <p className="mt-1 text-sm text-gray-900">{executionData.workflow?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Device</label>
                <p className="mt-1 text-sm text-gray-900">{executionData.device?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Stage</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {executionData.current_stage?.replace('_', ' ')}
                </p>
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Started At</label>
            <p className="mt-1 text-sm text-gray-900">
              {executionData.started_at ? formatDate(executionData.started_at) : 'Not started'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Completed At</label>
            <p className="mt-1 text-sm text-gray-900">
              {executionData.completed_at ? formatDate(executionData.completed_at) : 'In progress'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration</label>
            <p className="mt-1 text-sm text-gray-900">
              {formatDuration(executionData.started_at, executionData.completed_at)}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Created By</label>
            <p className="mt-1 text-sm text-gray-900">
              {executionData.created_by || 'System'}
            </p>
          </div>
        </div>
      </div>

      {/* Output */}
      {(executionData.stdout || executionData.output) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Output</h2>
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {executionData.stdout || executionData.output || 'No output available'}
            </pre>
          </div>
        </div>
      )}

      {/* Error Output */}
      {(executionData.stderr || executionData.error_message) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Output</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-sm text-red-800 whitespace-pre-wrap">
              {executionData.stderr || executionData.error_message || 'No error output'}
            </pre>
          </div>
        </div>
      )}

      {/* Ansible-specific details */}
      {isAnsibleExecution && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ansible Details</h2>
          <div className="space-y-4">
            {executionData.extra_vars && Object.keys(executionData.extra_vars).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Extra Variables</label>
                <div className="mt-1 bg-gray-50 rounded-lg p-3">
                  <pre className="text-sm text-gray-800">{JSON.stringify(executionData.extra_vars, null, 2)}</pre>
                </div>
              </div>
            )}
            
            {executionData.tags && executionData.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <div className="mt-1">
                  {executionData.tags.map((tag, index) => (
                    <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow-specific details */}
      {!isAnsibleExecution && executionData.command_executions && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Command Executions</h2>
          <div className="space-y-4">
            {executionData.command_executions.map((cmd, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {cmd.stage} - Command {index + 1}
                  </h3>
                  <StatusBadge status={cmd.status} type="command" />
                </div>
                <p className="text-sm text-gray-600 mb-2 font-mono">{cmd.command}</p>
                {cmd.output && (
                  <div className="bg-gray-50 rounded p-2">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">{cmd.output}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionDetail;