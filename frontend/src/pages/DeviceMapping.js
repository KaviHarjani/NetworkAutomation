import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ClipboardDocumentIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { deviceAPI, ansibleAPI } from '../services/api';

const DeviceMapping = () => {
  const [activeTab, setActiveTab] = useState('groupings'); // 'groupings' or 'mappings'
  const [groupings, setGroupings] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [selectedPlaybook, setSelectedPlaybook] = useState('');
  const [assignmentType, setAssignmentType] = useState('workflow'); // 'workflow' or 'playbook'
  const [expandedGroups, setExpandedGroups] = useState({});
  const [inventoryModal, setInventoryModal] = useState({ isOpen: false, content: '', groupName: '' });
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    fetchDeviceGroupings();
    fetchWorkflows();
    fetchPlaybooks();
    fetchDevices();
    fetchMappings();
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

  const fetchMappings = async () => {
    try {
      const response = await deviceAPI.getMappings();
      setMappings(response.data.mappings || []);
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
      // Don't show error toast for mappings as this might be a new feature
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await deviceAPI.getDevices();
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
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

  const fetchPlaybooks = async () => {
    try {
      const response = await ansibleAPI.getPlaybooks();
      setPlaybooks(response.data.playbooks);
    } catch (error) {
      toast.error('Failed to fetch playbooks: ' + (error.response?.data?.error || error.message));
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

  const handleAssignPlaybook = async (group) => {
    if (!selectedPlaybook) {
      toast.error('Please select a playbook first');
      return;
    }

    try {
      const response = await deviceAPI.assignPlaybookToGroup(selectedPlaybook, group.device_ids);
      toast.success(response.data.message);
      setSelectedGroup(null);
    } catch (error) {
      toast.error('Failed to assign playbook: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleGenerateInventory = async (group) => {
    try {
      setLoadingInventory(true);
      const response = await deviceAPI.generateGroupInventory(group.device_ids);
      setInventoryModal({
        isOpen: true,
        content: response.data.inventory_content,
        groupName: response.data.group_name
      });
    } catch (error) {
      toast.error('Failed to generate inventory: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingInventory(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Inventory content copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Device Management</h1>
          <p className="mt-2 text-gray-600">
            Manage device groupings and intelligent automation routing mappings
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('groupings')}
              className={`${
                activeTab === 'groupings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Device Groupings
            </button>
            <button
              onClick={() => setActiveTab('mappings')}
              className={`${
                activeTab === 'mappings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Playbook Mappings
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'groupings' ? (
          <>
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
                    Assignment Type
                  </label>
                  <select
                    value={assignmentType}
                    onChange={(e) => {
                      setAssignmentType(e.target.value);
                      setSelectedWorkflow('');
                      setSelectedPlaybook('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="workflow">Workflow</option>
                    <option value="playbook">Ansible Playbook</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {assignmentType === 'workflow' ? 'Select Workflow' : 'Select Ansible Playbook'}
                </label>
                {assignmentType === 'workflow' ? (
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
                ) : (
                  <select
                    value={selectedPlaybook}
                    onChange={(e) => setSelectedPlaybook(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a playbook...</option>
                    {playbooks.map(playbook => (
                      <option key={playbook.id} value={playbook.id}>
                        {playbook.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Device Groups Content */}
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
                      <div>
                        <div className="text-2xl font-bold text-blue-900">{playbooks.length}</div>
                        <div className="text-sm text-blue-700">Available Playbooks</div>
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
                                onClick={() => handleGenerateInventory(group)}
                                disabled={loadingInventory}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                {loadingInventory ? 'Generating...' : 'Generate Inventory'}
                              </button>
                              <button
                                onClick={() => setSelectedGroup(group)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                              >
                                Assign
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
          </>
        ) : (
          /* Playbook Mappings Tab */
          <MappingsTab 
            mappings={mappings}
            devices={devices}
            playbooks={playbooks}
            onRefresh={fetchMappings}
          />
        )}

        {/* Assignment Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assign {assignmentType === 'workflow' ? 'Workflow' : 'Playbook'}
              </h3>
              <p className="text-gray-600 mb-4">
                Assign {assignmentType === 'workflow' ? 'workflow' : 'playbook'} to <span className="font-medium">{selectedGroup.device_count}</span> devices:
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
                  Selected {assignmentType === 'workflow' ? 'Workflow' : 'Playbook'}
                </label>
                {assignmentType === 'workflow' ? (
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
                ) : (
                  <select
                    value={selectedPlaybook}
                    onChange={(e) => setSelectedPlaybook(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a playbook...</option>
                    {playbooks.map(playbook => (
                      <option key={playbook.id} value={playbook.id}>
                        {playbook.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (assignmentType === 'workflow') {
                      handleAssignWorkflow(selectedGroup);
                    } else {
                      handleAssignPlaybook(selectedGroup);
                    }
                  }}
                  disabled={assignmentType === 'workflow' ? !selectedWorkflow : !selectedPlaybook}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign {assignmentType === 'workflow' ? 'Workflow' : 'Playbook'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Modal */}
        {inventoryModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Generated Ansible Inventory
                  </h3>
                  <p className="text-sm text-gray-600">
                    Group: {inventoryModal.groupName} • {groupings.find(g => g.device_ids === inventoryModal.groupName)?.device_count || 'N/A'} devices
                  </p>
                </div>
                <button
                  onClick={() => setInventoryModal({ isOpen: false, content: '', groupName: '' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 h-full overflow-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {inventoryModal.content}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => copyToClipboard(inventoryModal.content)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setInventoryModal({ isOpen: false, content: '', groupName: '' })}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mappings Tab Component
const MappingsTab = ({ mappings, devices, playbooks, onRefresh }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'specific', 'metadata'

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = mapping.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mapping.workflow_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mapping.playbook_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'specific' && mapping.target_devices_info?.length > 0) ||
                         (filterType === 'metadata' && (!mapping.target_devices_info || mapping.target_devices_info.length === 0));
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Device-Playbook Mappings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure intelligent routing rules for automation workflows
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Mapping
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Mappings
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, workflow type, or playbook..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Mappings</option>
              <option value="specific">Specific Devices</option>
              <option value="metadata">Metadata Filters</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-900">{mappings.length}</div>
          <div className="text-sm text-blue-700">Total Mappings</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-900">
            {mappings.filter(m => m.is_active).length}
          </div>
          <div className="text-sm text-green-700">Active Mappings</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-900">
            {mappings.filter(m => m.target_devices_info?.length > 0).length}
          </div>
          <div className="text-sm text-purple-700">Device-Specific</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-orange-900">
            {mappings.filter(m => !m.target_devices_info || m.target_devices_info.length === 0).length}
          </div>
          <div className="text-sm text-orange-700">Metadata-Based</div>
        </div>
      </div>

      {/* Mappings List */}
      <div className="space-y-4">
        {filteredMappings.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border">
            <p className="text-gray-600">No mappings found</p>
            <p className="text-sm text-gray-500 mt-1">
              {mappings.length === 0 ? 'Create your first mapping to get started' : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          filteredMappings.map((mapping) => (
            <div key={mapping.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{mapping.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mapping.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {mapping.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Priority: {mapping.priority}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{mapping.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Workflow:</span>
                        <div className="text-gray-900">{mapping.workflow_type}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Playbook:</span>
                        <div className="text-gray-900">{mapping.playbook_name}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <div className="text-gray-900">
                          {mapping.target_devices_info?.length > 0 ? 'Specific Devices' : 'Metadata Filter'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Target Devices:</span>
                        <div className="text-gray-900">
                          {mapping.target_devices_info?.length || 0} devices
                        </div>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    {(!mapping.target_devices_info || mapping.target_devices_info.length === 0) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <div className="text-sm font-medium text-gray-700 mb-2">Metadata Filters:</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div><span className="text-gray-500">Vendor:</span> <span className="font-medium">{mapping.vendor || '*'}</span></div>
                          <div><span className="text-gray-500">Model:</span> <span className="font-medium">{mapping.model || '*'}</span></div>
                          <div><span className="text-gray-500">OS Version:</span> <span className="font-medium">{mapping.os_version || '*'}</span></div>
                          <div><span className="text-gray-500">Device Type:</span> <span className="font-medium">{mapping.device_type || '*'}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Target Devices List */}
                    {mapping.target_devices_info && mapping.target_devices_info.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <div className="text-sm font-medium text-blue-700 mb-2">Target Devices:</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {mapping.target_devices_info.map(device => (
                            <div key={device.id} className="text-sm bg-white p-2 rounded border">
                              <div className="font-medium">{device.name}</div>
                              <div className="text-gray-500 text-xs">{device.hostname}</div>
                              <div className="text-gray-500 text-xs">{device.vendor} {device.model}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setEditingMapping(mapping)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement delete */}}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMapping) && (
        <CreateMappingModal
          mapping={editingMapping}
          devices={devices}
          playbooks={playbooks}
          onClose={() => {
            setShowCreateModal(false);
            setEditingMapping(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingMapping(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// Create Mapping Modal Component
const CreateMappingModal = ({ mapping, devices, playbooks, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: mapping?.name || '',
    description: mapping?.description || '',
    workflow_type: mapping?.workflow_type || '',
    playbook: mapping?.playbook || '',
    priority: mapping?.priority || 100,
    is_active: mapping?.is_active !== false,
    vendor: mapping?.vendor || '',
    model: mapping?.model || '',
    os_version: mapping?.os_version || '',
    device_type: mapping?.device_type || '',
    target_devices: mapping?.target_devices_info?.map(d => d.id) || [],
    default_variables_dict: mapping?.default_variables_dict || {},
    required_params_list: mapping?.required_params_list || []
  });
  
  const [targetingType, setTargetingType] = useState(
    mapping?.target_devices_info?.length > 0 ? 'specific' : 'metadata'
  );
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTargetDeviceToggle = (deviceId) => {
    setFormData(prev => ({
      ...prev,
      target_devices: prev.target_devices.includes(deviceId)
        ? prev.target_devices.filter(id => id !== deviceId)
        : [...prev.target_devices, deviceId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare the data for submission
      const submitData = {
        name: formData.name,
        description: formData.description,
        workflow_type: formData.workflow_type,
        playbook: formData.playbook,
        priority: formData.priority,
        is_active: formData.is_active,
        default_variables_dict: formData.default_variables_dict,
        required_params_list: formData.required_params_list
      };

      // Add targeting data based on type
      if (targetingType === 'specific') {
        submitData.target_devices = formData.target_devices;
      } else {
        submitData.vendor = formData.vendor;
        submitData.model = formData.model;
        submitData.os_version = formData.os_version;
        submitData.device_type = formData.device_type;
      }

      if (mapping) {
        // Update existing mapping
        await deviceAPI.updateMapping(mapping.id, submitData);
        toast.success('Mapping updated successfully');
      } else {
        // Create new mapping
        await deviceAPI.createMapping(submitData);
        toast.success('Mapping created successfully');
      }
      
      onSave();
    } catch (error) {
      toast.error(`Failed to ${mapping ? 'update' : 'create'} mapping: ` + 
        (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deviceTypes = [
    { value: '', label: 'Any Device Type' },
    { value: 'router', label: 'Router' },
    { value: 'switch', label: 'Switch' },
    { value: 'firewall', label: 'Firewall' },
    { value: 'load_balancer', label: 'Load Balancer' },
    { value: 'server', label: 'Server' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {mapping ? 'Edit Mapping' : 'Create New Mapping'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mapping Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Cisco Core Switch Reboot"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Type *
              </label>
              <input
                type="text"
                required
                value={formData.workflow_type}
                onChange={(e) => handleInputChange('workflow_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., reboot, vlan_add, backup"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this mapping does..."
            />
          </div>

          {/* Targeting Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Device Targeting Method
            </label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="specific"
                  checked={targetingType === 'specific'}
                  onChange={(e) => setTargetingType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Specific Devices</span>
                <span className="text-xs text-gray-500 ml-2">(Target individual devices)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="metadata"
                  checked={targetingType === 'metadata'}
                  onChange={(e) => setTargetingType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Metadata Filters</span>
                <span className="text-xs text-gray-500 ml-2">(Target by vendor/model/OS)</span>
              </label>
            </div>

            {/* Specific Devices Selection */}
            {targetingType === 'specific' && (
              <div className="border border-gray-200 rounded-md p-4 max-h-64 overflow-y-auto">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Select Target Devices ({formData.target_devices.length} selected)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {devices.map(device => (
                    <label key={device.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.target_devices.includes(device.id)}
                        onChange={() => handleTargetDeviceToggle(device.id)}
                        className="mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium">{device.name}</div>
                        <div className="text-xs text-gray-500">
                          {device.hostname} • {device.vendor} {device.model}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Filters */}
            {targetingType === 'metadata' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => handleInputChange('vendor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Cisco (leave empty for any)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Catalyst 2960X (leave empty for any)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OS Version
                  </label>
                  <input
                    type="text"
                    value={formData.os_version}
                    onChange={(e) => handleInputChange('os_version', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 15.2(7)E10 (leave empty for any)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device Type
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => handleInputChange('device_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {deviceTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Playbook and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ansible Playbook *
              </label>
              <select
                required
                value={formData.playbook}
                onChange={(e) => handleInputChange('playbook', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a playbook...</option>
                {playbooks.map(playbook => (
                  <option key={playbook.id} value={playbook.id}>
                    {playbook.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="100"
              />
              <div className="text-xs text-gray-500 mt-1">
                Higher numbers = higher priority (1-200)
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Active Mapping</span>
            </label>
            <div className="text-xs text-gray-500 mt-1">
              Only active mappings will be used for routing
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.workflow_type || !formData.playbook}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (mapping ? 'Update Mapping' : 'Create Mapping')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceMapping;