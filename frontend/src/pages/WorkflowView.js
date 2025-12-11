import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  PlayIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import StatusBadge from '../components/StatusBadge';
import { workflowAPI } from '../services/api';
import toast from 'react-hot-toast';

const WorkflowView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch workflow details
  const { data, isLoading, error } = useQuery(
    ['workflow', id],
    () => workflowAPI.getWorkflow(id),
    {
      refetchOnWindowFocus: false,
    }
  );

  const workflow = data?.data;

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
    if (!commands || commands.length === 0) return null;

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
                {command.command || command}
              </div>
              {command.description && (
                <p className="text-sm text-gray-600 mt-2">{command.description}</p>
              )}
              {command.validation && (
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
    </div>
  );
};

export default WorkflowView;