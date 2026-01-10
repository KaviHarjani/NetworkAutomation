import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  DeviceTabletIcon,
  Cog6ToothIcon,
  PlayIcon,
  ClockIcon,
  ChartBarIcon,
  CircleStackIcon,
  ArrowRightIcon,
  PlusIcon,
  ServerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { deviceAPI, workflowAPI, executionAPI, ansibleAPI, dashboardAPI, healthAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalWorkflows: 0,
    totalExecutions: 0,
    totalAnsibleExecutions: 0,
    runningExecutions: 0,
    runningAnsibleExecutions: 0,
  });

  // Fetch dashboard data
  const { data: devicesData, isLoading: devicesLoading } = useQuery(
    'devices',
    () => deviceAPI.getDevices({ per_page: 1 }),
    { refetchOnWindowFocus: false }
  );

  const { data: workflowsData, isLoading: workflowsLoading } = useQuery(
    'workflows',
    () => workflowAPI.getWorkflows(),
    { refetchOnWindowFocus: false }
  );

  const { data: executionsData, isLoading: executionsLoading } = useQuery(
    'executions',
    () => executionAPI.getExecutions({ per_page: 100 }),
    { refetchOnWindowFocus: false }
  );

  // Fetch Ansible executions
  const { data: ansibleExecutionsData, isLoading: ansibleExecutionsLoading } = useQuery(
    'ansible-executions',
    () => ansibleAPI.getExecutions({ per_page: 100 }),
    { refetchOnWindowFocus: false }
  );

  // Fetch Celery health check
  const { data: celeryHealthData, isLoading: celeryHealthLoading, error: celeryHealthError } = useQuery(
    'celery-health',
    () => healthAPI.getCeleryHealth(),
    { 
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // Cache for 30 seconds
    }
  );

  // Calculate stats from API data
  useEffect(() => {
    if (devicesData && workflowsData && executionsData && ansibleExecutionsData) {
      const totalDevices = devicesData.data.total || 0;
      const totalWorkflows = workflowsData.data.workflows?.length || 0;
      const totalExecutions = executionsData.data.total || 0;
      const totalAnsibleExecutions = ansibleExecutionsData.data.total || 0;
      const runningExecutions = executionsData.data.executions?.filter(
        exec => exec.status === 'running'
      ).length || 0;
      const runningAnsibleExecutions = ansibleExecutionsData.data.executions?.filter(
        exec => exec.status === 'running'
      ).length || 0;

      setStats({
        totalDevices,
        totalWorkflows,
        totalExecutions: totalExecutions + totalAnsibleExecutions, // Combined total
        totalAnsibleExecutions,
        runningExecutions: Math.max(runningExecutions, runningAnsibleExecutions), // Use max to avoid double counting
        runningAnsibleExecutions,
      });
    }
  }, [devicesData, workflowsData, executionsData, ansibleExecutionsData]);

  // Fetch unified executions for recent executions
  const { data: unifiedExecutionsData, isLoading: unifiedExecutionsLoading } = useQuery(
    'unified-executions',
    () => executionAPI.getUnifiedExecutions({ per_page: 10 }),
    { refetchOnWindowFocus: false }
  );

  // Get recent executions from unified API or fallback to separate APIs
  const recentExecutions = unifiedExecutionsData?.data?.executions || [
    ...(executionsData?.data.executions?.slice(0, 5) || []).map(exec => ({
      ...exec,
      type: 'workflow'
    })),
    ...(ansibleExecutionsData?.data.executions?.slice(0, 5) || []).map(exec => ({
      ...exec,
      type: 'ansible',
      workflow: { name: exec.playbook_name || 'Ansible Playbook' },
      device: { name: exec.inventory_name || 'Ansible Inventory' }
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

  // Get device status counts
  const deviceStatusCounts = devicesData?.data.devices?.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Calculate execution stats from all available data
  const allExecutions = [
    ...(unifiedExecutionsData?.data?.executions || []),
    ...(executionsData?.data.executions || []),
    ...(ansibleExecutionsData?.data.executions || [])
  ];
  
  // Remove duplicates based on id to prevent double counting
  const uniqueExecutions = allExecutions.filter((execution, index, self) => 
    index === self.findIndex(e => e.id === execution.id)
  );
  
  const executionStats = uniqueExecutions.reduce(
    (acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { total: 0 }
  );

  const successRate = executionStats.total > 0 
    ? ((executionStats.completed || 0) / executionStats.total * 100).toFixed(1)
    : 0;

  if (devicesLoading || workflowsLoading || executionsLoading || ansibleExecutionsLoading || unifiedExecutionsLoading || celeryHealthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Celery health status
  const celeryHealthy = celeryHealthData?.data?.status === 'healthy';
  const celeryWorkers = celeryHealthData?.data?.workers || {};
  const celeryTasks = celeryHealthData?.data?.tasks || {};
  const celeryBroker = celeryHealthData?.data?.broker || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}


      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Devices"
          value={stats.totalDevices}
          icon={DeviceTabletIcon}
          color="blue"
        />
        <StatCard
          title="Active Workflows"
          value={stats.totalWorkflows}
          icon={Cog6ToothIcon}
          color="green"
        />
        <StatCard
          title="Total Executions"
          value={stats.totalExecutions}
          icon={PlayIcon}
          color="purple"
        />
        <StatCard
          title="Ansible Executions"
          value={stats.totalAnsibleExecutions}
          icon={PlayIcon}
          color="indigo"
        />
        <StatCard
          title="Running Now"
          value={stats.runningExecutions}
          icon={ClockIcon}
          color="red"
        />
        
        {/* Celery Health Status */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <ServerIcon className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Celery Worker Health
            </h3>
          </div>
          
          <div className="flex items-center mb-4">
            {celeryHealthy ? (
              <CheckCircleIcon className="h-8 w-8 text-green-500 mr-2" />
            ) : (
              <ExclamationCircleIcon className="h-8 w-8 text-red-500 mr-2" />
            )}
            <div>
              <div className={`text-lg font-bold ${celeryHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {celeryHealthy ? 'Healthy' : 'Unhealthy'}
              </div>
              <div className="text-sm text-gray-500">
                {celeryHealthError ? 'Connection failed' : celeryHealthData?.data?.celery_configured ? 'Worker responding' : 'Not configured'}
              </div>
            </div>
          </div>
          
          {celeryHealthData?.data?.celery_configured && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Workers</span>
                <span className="font-medium">{celeryWorkers.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Tasks</span>
                <span className="font-medium">{celeryTasks.active_tasks_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled Tasks</span>
                <span className="font-medium">{celeryTasks.scheduled_tasks_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Broker</span>
                <span className="font-medium text-xs truncate max-w-24" title={celeryBroker.broker || 'Unknown'}>
                  {celeryBroker.broker ? celeryBroker.broker.split('://')[0] : 'Unknown'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Execution Statistics (Last 30 Days)
            </h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {executionStats.completed || 0}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {executionStats.failed || 0}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {executionStats.running || 0}
              </div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Success Rate</span>
              <span>{successRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Device Status Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <CircleStackIcon className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Device Status Distribution
            </h3>
          </div>

          {Object.keys(deviceStatusCounts).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(deviceStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      status === 'online' ? 'bg-green-500' :
                      status === 'offline' ? 'bg-red-500' :
                      status === 'maintenance' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-gray-700 capitalize">{status}</span>
                  </div>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DeviceTabletIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No devices configured yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Executions (Workflow + Ansible)
            </h3>
          </div>
          <Link
            to="/executions"
            className="text-red-600 hover:text-red-700 font-medium flex items-center"
          >
            View All
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {recentExecutions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentExecutions.map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {execution.workflow?.name || execution.playbook?.name || execution.playbook_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DeviceTabletIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {execution.device?.name || execution.inventory?.name || execution.inventory_name || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={execution.status} type="execution" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {execution.started_at 
                        ? new Date(execution.started_at).toLocaleDateString()
                        : 'Not started'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/executions/${execution.id}`}
                        className="text-red-600 hover:text-red-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <PlayIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h3>
            <p className="text-gray-500 mb-4">Start by creating and executing your first workflow</p>
            <Link
              to="/workflows/execute"
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg inline-flex items-center"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Execute Workflow
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <PlusIcon className="h-6 w-6 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/devices/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex flex-col items-center text-center"
          >
            <DeviceTabletIcon className="h-8 w-8 text-blue-600 mb-2" />
            <span className="font-medium text-gray-900">Add Device</span>
          </Link>

          <Link
            to="/workflows/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex flex-col items-center text-center"
          >
            <Cog6ToothIcon className="h-8 w-8 text-green-600 mb-2" />
            <span className="font-medium text-gray-900">Create Workflow</span>
          </Link>

          <Link
            to="/workflows/execute"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex flex-col items-center text-center"
          >
            <PlayIcon className="h-8 w-8 text-red-600 mb-2" />
            <span className="font-medium text-gray-900">Execute Workflow</span>
          </Link>

          <a
            href="/admin/"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex flex-col items-center text-center"
          >
            <Cog6ToothIcon className="h-8 w-8 text-gray-600 mb-2" />
            <span className="font-medium text-gray-900">Admin Panel</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;