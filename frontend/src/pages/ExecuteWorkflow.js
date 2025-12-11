import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, DeviceTabletIcon, Cog6ToothIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { workflowAPI, deviceAPI } from '../services/api';

const ExecuteWorkflow = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [dynamicParams, setDynamicParams] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [workflowsResponse, devicesResponse] = await Promise.all([
          workflowAPI.getWorkflows(),
          deviceAPI.getDevices({ per_page: 100 })
        ]);

        setWorkflows(workflowsResponse.data.workflows);
        setDevices(devicesResponse.data.devices);
        setIsLoading(false);
      } catch (error) {
        toast.error('Failed to load data: ' + (error.response?.data?.error || error.message));
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleWorkflowSelect = (workflow) => {
    setSelectedWorkflow(workflow);
    setSelectedDevice(null);

    // Initialize dynamic params based on workflow commands
    const params = {};
    workflow.pre_check_commands?.forEach(cmd => {
      if (cmd.dynamic_regex) params[cmd.command] = '';
    });
    workflow.implementation_commands?.forEach(cmd => {
      if (cmd.dynamic_regex) params[cmd.command] = '';
    });
    workflow.post_check_commands?.forEach(cmd => {
      if (cmd.dynamic_regex) params[cmd.command] = '';
    });

    setDynamicParams(params);
  };

  const handleDynamicParamChange = (command, value) => {
    setDynamicParams(prev => ({
      ...prev,
      [command]: value
    }));
  };

  const handleExecute = async () => {
    if (!selectedWorkflow) {
      toast.error('Please select a workflow');
      return;
    }

    if (!selectedDevice) {
      toast.error('Please select a device');
      return;
    }

    // Check if all dynamic params are filled
    const missingParams = Object.entries(dynamicParams)
      .filter(([_, value]) => value === '')
      .map(([key]) => key);

    if (missingParams.length > 0) {
      toast.error(`Please fill in all dynamic parameters: ${missingParams.join(', ')}`);
      return;
    }

    try {
      setIsExecuting(true);

      // Prepare execution data with dynamic regex patterns
      const executionData = {
        workflow_id: selectedWorkflow.id,
        device_id: selectedDevice.id,
        dynamic_params: dynamicParams
      };

      const response = await workflowAPI.executeWorkflow(executionData);
      toast.success('Workflow execution started successfully!');
      navigate(`/executions/${response.data.execution_id}`);
    } catch (error) {
      toast.error('Failed to execute workflow: ' + (error.response?.data?.error || error.message));
      setIsExecuting(false);
    }
  };

  const getCommandDescription = (command) => {
    const descriptions = {
      'show interface': 'Show interface status and configuration',
      'show version': 'Show system version and uptime',
      'show running-config': 'Show current running configuration',
      'configure terminal': 'Enter configuration mode',
      'interface': 'Configure interface settings',
      'shutdown': 'Administratively shutdown interface',
      'no shutdown': 'Enable interface',
      'port activation': 'Activate specific port',
      'show ip interface brief': 'Show brief IP interface information'
    };

    // Extract base command (remove parameters)
    const baseCommand = command.split(' ')[0].toLowerCase();
    return descriptions[baseCommand] || 'Execute command on device';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          to="/workflows"
          className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Execute Workflow</h1>
          <p className="text-gray-600 mt-1">Execute a workflow on a device with dynamic parameter support</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflows and devices...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow Selection */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Workflow</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {workflows.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No workflows available</p>
                ) : (
                  workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedWorkflow?.id === workflow.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{workflow.description || 'No description'}</p>
                        </div>
                        <Cog6ToothIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      </div>
                      {workflow.command_counts && (
                        <div className="mt-3 flex space-x-4 text-xs">
                          <span className="text-blue-600">Pre: {workflow.command_counts.pre_check}</span>
                          <span className="text-green-600">Impl: {workflow.command_counts.implementation}</span>
                          <span className="text-purple-600">Post: {workflow.command_counts.post_check}</span>
                          <span className="text-red-600">Rollback: {workflow.command_counts.rollback}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Device Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Device</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {devices.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No devices available</p>
                ) : (
                  devices.map((device) => (
                    <div
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedDevice?.id === device.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{device.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{device.ip_address}</p>
                          <p className="text-xs text-gray-400 mt-1">{device.model} • {device.vendor}</p>
                        </div>
                        <DeviceTabletIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Workflow Details & Dynamic Parameters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workflow Details */}
            {selectedWorkflow && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Details</h3>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">Commands Overview</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedWorkflow.command_counts?.pre_check || 0}
                      </div>
                      <div className="text-sm text-blue-700">Pre-Check</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedWorkflow.command_counts?.implementation || 0}
                      </div>
                      <div className="text-sm text-green-700">Implementation</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedWorkflow.command_counts?.post_check || 0}
                      </div>
                      <div className="text-sm text-purple-700">Post-Check</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedWorkflow.command_counts?.rollback || 0}
                      </div>
                      <div className="text-sm text-red-700">Rollback</div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Parameters Section */}
                {Object.keys(dynamicParams).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Dynamic Parameters</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Configure dynamic regex patterns for commands that require user input
                    </p>

                    <div className="space-y-4">
                      {Object.entries(dynamicParams).map(([command, value]) => (
                        <div key={command} className="bg-gray-50 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {command}
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            {getCommandDescription(command)}
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleDynamicParamChange(command, e.target.value)}
                              placeholder={`Enter parameter for ${command}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                            <button
                              onClick={() => handleDynamicParamChange(command, '')}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Clear parameter"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            This will be used to dynamically generate regex patterns for validation
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Execution Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Controls</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Selected Workflow:</span>
                  <span className="font-medium">
                    {selectedWorkflow ? selectedWorkflow.name : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Selected Device:</span>
                  <span className="font-medium">
                    {selectedDevice ? selectedDevice.name : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Dynamic Parameters:</span>
                  <span className="font-medium">
                    {Object.values(dynamicParams).filter(v => v).length} / {Object.keys(dynamicParams).length} configured
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleExecute}
                  disabled={!selectedWorkflow || !selectedDevice || isExecuting}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
                    !selectedWorkflow || !selectedDevice || isExecuting
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Executing...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5" />
                      Execute Workflow
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecuteWorkflow;