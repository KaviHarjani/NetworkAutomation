import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  BugAntIcon,
} from '@heroicons/react/24/outline';

import { logsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Logs = () => {
  const [filters, setFilters] = useState({
    level: '',
    type: '',
    search: '',
    page: 1,
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logsData, isLoading, error } = useQuery(
    ['logs', filters],
    () => fetchLogs(filters),
    {
      keepPreviousData: true,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const fetchLogs = async (params) => {
    const queryParams = new URLSearchParams();
    if (params.level) queryParams.append('level', params.level);
    if (params.type) queryParams.append('type', params.type);
    if (params.search) queryParams.append('search', params.search);
    queryParams.append('page', params.page);
    queryParams.append('per_page', 20);

    const response = await logsAPI.getLogs(Object.fromEntries(queryParams));
    return response.data;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'ERROR':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'WARNING':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'INFO':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'DEBUG':
        return <BugAntIcon className="h-5 w-5 text-gray-500" />;
      case 'AUDIT':
        return <DocumentTextIcon className="h-5 w-5 text-green-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800';
      case 'AUDIT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (error) {
    toast.error('Failed to load logs');
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
            <p className="text-gray-600 mt-1">Monitor system events and changes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                <option value="ERROR">Error</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
                <option value="AUDIT">Audit</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="SYSTEM">System</option>
                <option value="AUTHENTICATION">Authentication</option>
                <option value="DEVICE">Device</option>
                <option value="WORKFLOW">Workflow</option>
                <option value="CONFIGURATION">Configuration</option>
                <option value="TACACS">TACACS</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ level: '', type: '', search: '', page: 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading logs...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logsData?.logs?.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getLogIcon(log.level)}
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                              {log.level}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.type}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {log.message}
                          </div>
                          {log.details && (
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {log.details}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.user || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.has_changes && (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-red-600 hover:text-red-900"
                            >
                              View Changes
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logsData && logsData.total > 20 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(filters.page - 1)}
                        disabled={!logsData.has_previous}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={!logsData.has_next}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{filters.page}</span> of{' '}
                          <span className="font-medium">
                            {Math.ceil(logsData.total / 20)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => handlePageChange(filters.page - 1)}
                            disabled={!logsData.has_previous}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handlePageChange(filters.page + 1)}
                            disabled={!logsData.has_next}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
};

// Log Detail Modal Component
const LogDetailModal = ({ log, onClose }) => {
  const { data: logDetail, isLoading } = useQuery(
    ['log', log.id],
    () => logsAPI.getLog(log.id).then(res => res.data),
    {
      enabled: !!log.id,
    }
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Log Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="mt-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading details...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Level:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeClass(logDetail.level)}`}>
                      {logDetail.level}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="ml-2 text-gray-900">{logDetail.type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User:</span>
                    <span className="ml-2 text-gray-900">{logDetail.user || 'System'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span>
                    <span className="ml-2 text-gray-900">{new Date(logDetail.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <span className="font-medium text-gray-700">Message:</span>
                  <p className="mt-1 text-gray-900">{logDetail.message}</p>
                </div>

                {/* Details */}
                {logDetail.details && (
                  <div>
                    <span className="font-medium text-gray-700">Details:</span>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{logDetail.details}</p>
                  </div>
                )}

                {/* Changes Diff */}
                {(logDetail.old_values || logDetail.new_values) && (
                  <div>
                    <span className="font-medium text-gray-700">Changes:</span>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        Before / After
                      </div>
                      <div className="p-4 bg-white">
                        {logDetail.diff_html ? (
                          <div 
                            className="diff-container text-sm font-mono"
                            dangerouslySetInnerHTML={{ __html: logDetail.diff_html }}
                          />
                        ) : (
                          <div className="space-y-2">
                            {logDetail.old_values && (
                              <div>
                                <div className="text-xs font-medium text-red-600 mb-1">Old Values:</div>
                                <pre className="text-xs bg-red-50 p-2 rounded border overflow-x-auto">
                                  {logDetail.old_values}
                                </pre>
                              </div>
                            )}
                            {logDetail.new_values && (
                              <div>
                                <div className="text-xs font-medium text-green-600 mb-1">New Values:</div>
                                <pre className="text-xs bg-green-50 p-2 rounded border overflow-x-auto">
                                  {logDetail.new_values}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for badge styling
const getLevelBadgeClass = (level) => {
  switch (level) {
    case 'ERROR':
      return 'bg-red-100 text-red-800';
    case 'WARNING':
      return 'bg-yellow-100 text-yellow-800';
    case 'INFO':
      return 'bg-blue-100 text-blue-800';
    case 'DEBUG':
      return 'bg-gray-100 text-gray-800';
    case 'AUDIT':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default Logs;