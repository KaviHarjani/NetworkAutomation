import React, { useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  BugAntIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

import { logsAPI } from '../services/api';
import toast from 'react-hot-toast';
import ConfigDiffViewer from '../components/ConfigDiffViewer';

const Logs = () => {
  const [filters, setFilters] = useState({
    level: '',
    type: '',
    search: '',
    page: 1,
  });
  const [viewMode, setViewMode] = useState('paginated'); // 'paginated' or 'single-page'
  const [selectedLog, setSelectedLog] = useState(null);
  const [compareLogs, setCompareLogs] = useState({ left: null, right: null });

  const fetchLogs = useCallback(async (params) => {
    const queryParams = new URLSearchParams();
    if (params.level) queryParams.append('level', params.level);
    if (params.type) queryParams.append('type', params.type);
    if (params.search) queryParams.append('search', params.search);
    
    if (viewMode === 'single-page') {
      // Fetch all logs for single-page view
      queryParams.append('per_page', 1000);
    } else {
      queryParams.append('page', params.page);
      queryParams.append('per_page', 20);
    }

    const response = await logsAPI.getLogs(Object.fromEntries(queryParams));
    return response.data;
  }, [viewMode]);

  const { data: logsData, isLoading, error, refetch } = useQuery(
    ['logs', filters, viewMode],
    () => fetchLogs(filters),
    {
      keepPreviousData: true,
      refetchInterval: 30000,
    }
  );

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

  const handleLogClick = (log) => {
    setSelectedLog(log);
  };

  const toggleCompareSelection = (log) => {
    setCompareLogs(prev => {
      if (prev.left?.id === log.id) {
        return { ...prev, left: null };
      } else if (prev.right?.id === log.id) {
        return { ...prev, right: null };
      } else if (!prev.left) {
        return { ...prev, left: log };
      } else if (!prev.right) {
        return { ...prev, right: log };
      } else {
        // Replace right if both are selected
        return { ...prev, right: log };
      }
    });
  };

  const clearCompareSelection = () => {
    setCompareLogs({ left: null, right: null });
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'paginated' ? 'single-page' : 'paginated')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'single-page'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {viewMode === 'single-page' ? 'Single Page View' : 'Paginated View'}
            </button>
          </div>
        </div>

        {/* Compare Selection Bar */}
        {compareLogs.left || compareLogs.right ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {compareLogs.left && compareLogs.right
                    ? '2 logs selected for comparison'
                    : 'Select one more log to compare'}
                </span>
                {compareLogs.left && (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {compareLogs.left.message?.substring(0, 30)}...
                  </span>
                )}
                {compareLogs.right && (
                  <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {compareLogs.right.message?.substring(0, 30)}...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {compareLogs.left && compareLogs.right && (
                  <button
                    onClick={() => setSelectedLog({ ...compareLogs, isComparison: true })}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Compare
                  </button>
                )}
                <button
                  onClick={clearCompareSelection}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        ) : null}

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

        {/* Logs Count */}
        <div className="text-sm text-gray-600">
          {logsData && (
            <span>Showing {logsData.logs?.length || 0} of {logsData.total || 0} logs</span>
          )}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          checked={false}
                          onChange={() => {}}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compare
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logsData?.logs?.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => handleLogClick(log)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          compareLogs.left?.id === log.id
                            ? 'bg-blue-50'
                            : compareLogs.right?.id === log.id
                            ? 'bg-purple-50'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={compareLogs.left?.id === log.id || compareLogs.right?.id === log.id}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCompareSelection(log);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getLogIcon(log.level)}
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                              {log.level}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.type}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {log.message}
                          </div>
                          {log.details && (
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {log.details}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.user || 'System'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompareSelection(log);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              compareLogs.left?.id === log.id
                                ? 'bg-blue-100 text-blue-600'
                                : compareLogs.right?.id === log.id
                                ? 'bg-purple-100 text-purple-600'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                            title="Select for comparison"
                          >
                            <ArrowsRightLeftIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination (only for paginated view) */}
              {viewMode === 'paginated' && logsData && logsData.total > 20 && (
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
      {selectedLog && !selectedLog.isComparison && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}

      {/* Diff Comparison Modal */}
      {selectedLog?.isComparison && compareLogs.left && compareLogs.right && (
        <DiffComparisonModal
          leftLog={compareLogs.left}
          rightLog={compareLogs.right}
          onClose={() => {
            setSelectedLog(null);
            clearCompareSelection();
          }}
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
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
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
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeClass(logDetail?.level)}`}>
                      {logDetail?.level}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="ml-2 text-gray-900">{logDetail?.type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User:</span>
                    <span className="ml-2 text-gray-900">{logDetail?.user || 'System'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span>
                    <span className="ml-2 text-gray-900">{new Date(logDetail?.created_at).toLocaleString()}</span>
                  </div>
                  {logDetail?.ip_address && (
                    <div>
                      <span className="font-medium text-gray-700">IP Address:</span>
                      <span className="ml-2 text-gray-900">{logDetail.ip_address}</span>
                    </div>
                  )}
                  {logDetail?.object_type && (
                    <div>
                      <span className="font-medium text-gray-700">Object:</span>
                      <span className="ml-2 text-gray-900">{logDetail.object_type} ({logDetail.object_id})</span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <span className="font-medium text-gray-700">Message:</span>
                  <p className="mt-1 text-gray-900">{logDetail?.message}</p>
                </div>

                {/* Details */}
                {logDetail?.details && (
                  <div>
                    <span className="font-medium text-gray-700">Details:</span>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{logDetail.details}</p>
                  </div>
                )}

                {/* Changes Diff */}
                {(logDetail?.old_values || logDetail?.new_values) && (
                  <div>
                    <span className="font-medium text-gray-700">Changes:</span>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        Before / After
                      </div>
                      <div className="p-4 bg-white">
                        {logDetail?.diff_html ? (
                          <div 
                            className="diff-container text-sm font-mono"
                            dangerouslySetInnerHTML={{ __html: logDetail.diff_html }}
                          />
                        ) : (
                          <div className="space-y-2">
                            {logDetail?.old_values && (
                              <div>
                                <div className="text-xs font-medium text-red-600 mb-1">Old Values:</div>
                                <pre className="text-xs bg-red-50 p-2 rounded border overflow-x-auto">
                                  {typeof logDetail.old_values === 'string' 
                                    ? logDetail.old_values 
                                    : JSON.stringify(logDetail.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {logDetail?.new_values && (
                              <div>
                                <div className="text-xs font-medium text-green-600 mb-1">New Values:</div>
                                <pre className="text-xs bg-green-50 p-2 rounded border overflow-x-auto">
                                  {typeof logDetail.new_values === 'string' 
                                    ? logDetail.new_values 
                                    : JSON.stringify(logDetail.new_values, null, 2)}
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

// Diff Comparison Modal Component (GitHub-style)
const DiffComparisonModal = ({ leftLog, rightLog, onClose }) => {
  const [viewMode, setViewMode] = useState('unified');

  // Generate diff data
  const generateDiff = () => {
    const leftValues = leftLog.old_values || leftLog.new_values || '';
    const rightValues = rightLog.old_values || rightLog.new_values || '';
    
    return {
      left: leftValues,
      right: rightValues
    };
  };

  const diffData = generateDiff();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-11/12 lg:w-11/12 shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden flex flex-col">
        <div className="mt-3 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Compare Log Changes
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Comparing changes between two log entries
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Comparison Header */}
          <div className="flex items-center gap-4 py-4 bg-gray-50 border-b">
            <div className="flex-1 p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-700">Base (Left)</span>
              </div>
              <div className="text-xs text-gray-500">
                {leftLog.type} • {new Date(leftLog.created_at).toLocaleString()}
              </div>
              <div className="text-sm text-gray-900 mt-1 truncate">
                {leftLog.message}
              </div>
            </div>
            <div className="flex items-center">
              <ArrowsRightLeftIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="flex-1 p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-gray-700">Comparison (Right)</span>
              </div>
              <div className="text-xs text-gray-500">
                {rightLog.type} • {new Date(rightLog.created_at).toLocaleString()}
              </div>
              <div className="text-sm text-gray-900 mt-1 truncate">
                {rightLog.message}
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 py-2 border-b">
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'unified'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'raw'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </button>
          </div>

          {/* Diff Content */}
          <div className="flex-1 overflow-auto py-4">
            {viewMode === 'raw' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold mb-2 text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Base (Left)
                  </h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                    {diffData.left || 'No content'}
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    Comparison (Right)
                  </h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                    {diffData.right || 'No content'}
                  </pre>
                </div>
              </div>
            ) : (
              <GitHubStyleDiff
                oldValue={diffData.left}
                newValue={diffData.right}
                viewMode={viewMode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// GitHub-style Diff Component
const GitHubStyleDiff = ({ oldValue, newValue, viewMode }) => {
  // Simple line-by-line diff
  const generateDiffLines = () => {
    const oldLines = (oldValue || '').split('\n');
    const newLines = (newValue || '').split('\n');
    
    // Use difflib for unified diff
    const diff = [];
    let i = 0, j = 0;
    
    while (i < oldLines.length || j < newLines.length) {
      if (i >= oldLines.length) {
        // Only new lines remaining
        diff.push({ type: 'add', content: newLines[j], lineNum: j + 1 });
        j++;
      } else if (j >= newLines.length) {
        // Only old lines remaining
        diff.push({ type: 'remove', content: oldLines[i], lineNum: i + 1 });
        i++;
      } else if (oldLines[i] === newLines[j]) {
        // Same line
        diff.push({ type: 'context', content: oldLines[i], lineNum: i + 1 });
        i++;
        j++;
      } else {
        // Different lines - check if they're similar
        const similarity = calculateSimilarity(oldLines[i], newLines[j]);
        if (similarity > 0.6) {
          diff.push({ type: 'remove', content: oldLines[i], lineNum: i + 1 });
          diff.push({ type: 'add', content: newLines[j], lineNum: j + 1 });
          i++;
          j++;
        } else {
          diff.push({ type: 'remove', content: oldLines[i], lineNum: i + 1 });
          diff.push({ type: 'add', content: newLines[j], lineNum: j + 1 });
          i++;
          j++;
        }
      }
    }
    
    return diff;
  };

  const calculateSimilarity = (str1, str2) => {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  const diffLines = generateDiffLines();
  
  // Split view: separate columns
  if (viewMode === 'split') {
    const oldLines = diffLines.filter(l => l.type !== 'add');
    const newLines = diffLines.filter(l => l.type !== 'remove');
    
    return (
      <div className="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden">
        <div className="border-r">
          <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-700 border-b">
            Base (Left)
          </div>
          <div className="font-mono text-sm">
            {oldLines.map((line, idx) => (
              <div
                key={idx}
                className={`px-4 py-0.5 flex ${
                  line.type === 'remove' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-white text-gray-600'
                }`}
              >
                <span className="w-8 text-gray-400 select-none text-right pr-2">
                  {line.type === 'remove' ? line.lineNum : ''}
                </span>
                <span className="flex-1">{line.content || ' '}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border-b">
            Comparison (Right)
          </div>
          <div className="font-mono text-sm">
            {newLines.map((line, idx) => (
              <div
                key={idx}
                className={`px-4 py-0.5 flex ${
                  line.type === 'add' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-white text-gray-600'
                }`}
              >
                <span className="w-8 text-gray-400 select-none text-right pr-2">
                  {line.type === 'add' ? line.lineNum : ''}
                </span>
                <span className="flex-1">{line.content || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Unified view
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b">
        Unified Diff
      </div>
      <div className="font-mono text-sm">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`px-4 py-0.5 flex ${
              line.type === 'add'
                ? 'bg-green-100 text-green-800'
                : line.type === 'remove'
                ? 'bg-red-100 text-red-800'
                : 'bg-white text-gray-600'
            }`}
          >
            <span className="w-8 text-gray-400 select-none text-right pr-2">
              {line.type === 'context' ? line.lineNum : ''}
            </span>
            <span className="w-6 text-gray-500 select-none">
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            <span className="flex-1">{line.content || ' '}</span>
          </div>
        ))}
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
