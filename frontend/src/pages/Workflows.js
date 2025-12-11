import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

import StatusBadge from '../components/StatusBadge';
import { workflowAPI } from '../services/api';
import toast from 'react-hot-toast';

const Workflows = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch workflows
  const { data, isLoading, error, refetch } = useQuery(
    ['workflows', searchTerm, statusFilter],
    () => workflowAPI.getWorkflows(),
    {
      refetchOnWindowFocus: false,
    }
  );

  const workflows = data?.data.workflows || [];

  // Filter workflows
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchTerm || 
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (error) {
    toast.error('Failed to load workflows');
  }

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600 mt-1">Create and manage automation workflows</p>
        </div>
        <Link
          to="/workflows/create"
          className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-red-600 text-white hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Search
          </button>
        </form>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Cog6ToothIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                    <StatusBadge status={workflow.status} type="workflow" />
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {workflow.description}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pre-check:</span>
                  <span className="font-medium">{workflow.command_counts?.pre_check || 0} commands</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Implementation:</span>
                  <span className="font-medium">{workflow.command_counts?.implementation || 0} commands</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Post-check:</span>
                  <span className="font-medium">{workflow.command_counts?.post_check || 0} commands</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Created by {workflow.created_by}
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    View
                  </Link>
                  <Link
                    to={`/workflows/${workflow.id}/edit`}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="text-center py-12">
              <Cog6ToothIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first workflow'
                }
              </p>
              <Link
                to="/workflows/create"
                className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg inline-flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Workflow
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;