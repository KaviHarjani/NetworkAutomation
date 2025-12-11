import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { deviceAPI } from '../services/api';

const DeviceMapping = () => {
  const [groupings, setGroupings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    fetchDeviceGroupings();
    fetchWorkflows();
  }, []);

  const fetchDeviceGroupings = async () => {
    try {
      setLoading(true);
      const response = await deviceAPI.getDeviceGroupings();
      setGroupings(response.data.groupings);
    } catch (error) {
      toast.error('Failed to fetch device groupings: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const response = await deviceAPI.getWorkflows();
      setWorkflows(response.data.workflows);
    } catch (error) {
      toast.error('Failed to fetch workflows: ' + (error.response?.data?.error || error.message));
    }
  };

  const toggleGroupExpansion = (index) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAssignWorkflow = async (group) => {
    if (!selectedWorkflow) {
      toast.error('Please select a workflow first');
      return;
    }

    try {
      const response = await deviceAPI.assignWorkflowToGroup(selectedWorkflow, group.device_ids);
      toast.success(response.data.message);
      setSelectedGroup(null);
    } catch (error) {
      toast.error('Failed to assign workflow: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredGroupings = groupings.filter(group =>
    group.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.os_version.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Device Mapping</h1>
          <p className="mt-2 text-gray-600">
            Group devices by model, OS version, and vendor for bulk workflow assignment
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Device Groups
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by model, OS, or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Workflow
              </label>
              <select
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a workflow...</option>
                {workflows.map(workflow => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Device Groups */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading device groupings...</p>
            </div>
          ) : filteredGroupings.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border">
              <p className="text-gray-600">No device groups found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{groupings.length}</div>
                    <div className="text-sm text-blue-700">Unique Device Groups</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-900">
                      {groupings.reduce((sum, group) => sum + group.device_count, 0)}
                    </div>
                    <div className="text-sm text-blue-700">Total Devices</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{workflows.length}</div>
                    <div className="text-sm text-blue-700">Available Workflows</div>
                  </div>
                </div>
              </div>

              {/* Group List */}
              <div className="space-y-3">
                {filteredGroupings.map((group, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">
                                {group.model} • {group.os_version} • {group.vendor}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {group.device_count} devices
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleGroupExpansion(index)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            {expandedGroups[index] ? 'Hide' : 'Show'} Devices
                          </button>
                          <button
                            onClick={() => setSelectedGroup(group)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Assign Workflow
                          </button>
                        </div>
                      </div>

                      {/* Device List (expanded) */}
                      {expandedGroups[index] && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.device_ids.map(deviceId => (
                              <div key={deviceId} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                <div className="text-sm font-medium text-gray-900">Device ID: {deviceId}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Part of {group.model} group
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Assignment Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Workflow</h3>
              <p className="text-gray-600 mb-4">
                Assign workflow to <span className="font-medium">{selectedGroup.device_count}</span> devices:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
                <div className="text-sm font-medium">{selectedGroup.model}</div>
                <div className="text-sm text-gray-600">{selectedGroup.os_version} • {selectedGroup.vendor}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedGroup.device_count} devices in this group
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Workflow
                </label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a workflow...</option>
                  {workflows.map(workflow => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAssignWorkflow(selectedGroup)}
                  disabled={!selectedWorkflow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign Workflow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceMapping;