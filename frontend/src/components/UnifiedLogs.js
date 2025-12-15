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
  PlayIcon,
  CogIcon,
  CommandLineIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import toast from 'react-hot-toast';

const UnifiedLogs = () => {
  const [filters, setFilters] = useState({
    level: '',
    log_type: '',
    device_name: '',
    search: '',
    page: 1,
    per_page: 20,
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: logsData, isLoading, error, refetch } = useQuery(
    ['unified-logs', filters],
    () => fetchUnifiedLogs(filters),
    {
      keepPreviousData: true,
      refetchInterval: 30000,
    }
  );

  const { data: logTypesData } = useQuery('log-types', fetchLogTypes);
  const { data: devicesData } = useQuery('devices', fetchDevices);

  const fetchUnifiedLogs = async (params) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const response = await fetch(`/api/unified-logs/?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  };

  const fetchLogTypes = async () => {
    const response = await fetch('/api/unified-logs/log-types/');
    if (!response.ok) throw new Error('Failed to fetch log types');
    return response.json();
  };

  const fetchDevices = async () => {
    const response = await fetch('/api/unified-logs/devices/');
    if (!response.ok) throw new Error('Failed to fetch devices');
    return response.json();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      log_type: '',
      device_name: '',
      search: '',
      page: 1,
      per_page: 20,
    });
  };

  const getLogIcon = (logType, level) => {
    switch (logType) {
      case 'ansible':
        return <PlayIcon className="h-5 w-5 text-green-500" />;
      case 'workflow':
        return <CogIcon className="h-5 w-5 text-blue-500" />;
      case 'command':
        return <CommandLineIcon className="h-5 w-5 text-purple-500" />;
      case 'system':
        return getLevelIcon(level);
      default:
        return getLevelIcon(level);
    }
  };

  const getLevelIcon = (level) => {
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

  const getLogTypeBadgeClass = (logType) => {
    switch (logType) {
      case 'ansible':
        return 'bg-green-100 text-green-800';
      case 'workflow':
        return 'bg-blue-100 text-blue-800';
      case 'command':
        return 'bg-purple-100 text-purple-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (error) {
    toast.error('Failed to load unified logs');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unified Logs</h1>
          <p className="text-gray-600 mt-1">
            Combined view of system logs, Ansible executions, and workflow logs
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Log Type Summary */}
      {logTypesData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(logTypesData.log_types).map(([type, info]) => (
            <div key={type} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{info.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{info.count}</p>
                </div>
                {getLogIcon(type, 'INFO')}
              </div>
              <p className="text-xs text-gray-500 mt-2">{info.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

          {/* Log Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Type
            </label>
            <select
              value={filters.log_type}
              onChange={(e) => handleFilterChange('log_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="system">System Logs</option>
              <option value="ansible">Ansible Playbooks</option>
              <option value="workflow">Workflow Executions</option>
              <option value="command">Command Executions</option>
            </select>
          </div>

          {/* Device Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device
            </label>
            <select
              value={filters.device_name}
              onChange={(e) => handleFilterChange('device_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Devices</option>
              {devicesData?.devices?.map(device => (
                <option key={device.id} value={device.name}>
                  {device.name} ({device.ip_address})
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
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
            <p className="mt-2 text-gray-600">Loading unified logs...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
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
                          {getLogIcon(log.log_type, log.level)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeBadgeClass(log.log_type)}`}>
                            {log.log_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.message}
                        </div>
                        {log.command && (
                          <div className="text-xs text-gray-500 max-w-xs truncate font-mono">
                            {log.command}
                          </div>
                        )}
                        {log.playbook_name && (
                          <div className="text-xs text-gray-500">
                            Playbook: {log.playbook_name}
                          </div>
                        )}
                        {log.workflow_name && (
                          <div className="text-xs text-gray-500">
                            Workflow: {log.workflow_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.device_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.execution_id && (
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetails(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsData && logsData.total > filters.per_page && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{filters.page}</span> of{' '}
                      <span className="font-medium">
                        {Math.ceil(logsData.total / filters.per_page)}
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
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {showDetails && selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => {
            setShowDetails(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
};

// Log Detail Modal Component
const LogDetailModal = ({ log, onClose }) => {
  const { data: executionDetails, isLoading } = useQuery(
    ['execution-details', log.execution_id, log.execution_type],
    () => fetchExecutionDetails(log.execution_id, log.execution_type),
    {
      enabled: !!log.execution_id && !!log.execution_type,
    }
  );

  const fetchExecutionDetails = async (executionId, executionType) => {
    const response = await fetch(`/api/unified-logs/execution_logs/?execution_id=${executionId}&execution_type=${executionType}`);
    if (!response.ok) throw new Error('Failed to fetch execution details');
    return response.json();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTitle = () => {
    if (log.execution_type === 'ansible') {
      return `Ansible Execution: ${log.playbook_name || 'Unknown Playbook'}`;
    } else if (log.execution_type === 'workflow') {
      return `Workflow Execution: ${log.workflow_name || 'Unknown Workflow'}`;
    } else if (log.execution_type === 'command') {
      return 'Command Execution';
    } else {
      return 'Log Details';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {getTitle()}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="mt-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading execution details...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Level:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="ml-2 text-gray-900">{log.log_type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Device:</span>
                    <span className="ml-2 text-gray-900">{log.device_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User:</span>
                    <span className="ml-2 text-gray-900">{log.user || 'System'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span>
                    <span className="ml-2 text-gray-900">{formatDate(log.timestamp)}</span>
                  </div>
                  {log.execution_id && (
                    <div>
                      <span className="font-medium text-gray-700">Execution ID:</span>
                      <span className="ml-2 text-gray-900 font-mono text-xs">{log.execution_id}</span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <span className="font-medium text-gray-700">Message:</span>
                  <p className="mt-1 text-gray-900">{log.message}</p>
                </div>

                {/* Command */}
                {log.command && (
                  <div>
                    <span className="font-medium text-gray-700">Command:</span>
                    <p className="mt-1 text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded border">
                      {log.command}
                    </p>
                  </div>
                )}

                {/* Playbook Details */}
                {log.playbook_name && (
                  <div>
                    <span className="font-medium text-gray-700">Playbook:</span>
                    <p className="mt-1 text-gray-900">{log.playbook_name}</p>
                  </div>
                )}

                {/* Workflow Details */}
                {log.workflow_name && (
                  <div>
                    <span className="font-medium text-gray-700">Workflow:</span>
                    <p className="mt-1 text-gray-900">{log.workflow_name}</p>
                  </div>
                )}

                {/* Execution Details */}
                {executionDetails && (
                  <div>
                    <span className="font-medium text-gray-700">Execution Details:</span>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        Output
                      </div>
                      <div className="p-4 bg-white max-h-64 overflow-y-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {executionDetails.output || 'No output available'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                {log.details && (
                  <div>
                    <span className="font-medium text-gray-700">Additional Details:</span>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{log.details}</p>
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

// Helper function for badge styling (duplicate to avoid scope issues)
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

export default UnifiedLogs;
