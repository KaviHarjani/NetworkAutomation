import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PlayIcon, DocumentTextIcon, DocumentDuplicateIcon, PencilIcon, TrashIcon, EyeIcon, CodeBracketIcon, BookOpenIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsibleWorkflows = () => {
  const navigate = useNavigate();
  const [playbooks, setPlaybooks] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('playbooks');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [filesystemPlaybooks, setFilesystemPlaybooks] = useState([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [playbooksRes, inventoriesRes, executionsRes] = await Promise.all([
          ansibleAPI.getPlaybooks(),
          ansibleAPI.getInventories(),
          ansibleAPI.getExecutions()
        ]);
        
        setPlaybooks(playbooksRes.data.playbooks || []);
        setInventories(inventoriesRes.data.inventories || []);
        setExecutions(executionsRes.data.executions || []);
        
        // Also discover playbooks from filesystem
        try {
          const discoveryRes = await ansibleAPI.discoverPlaybooks();
          setFilesystemPlaybooks(discoveryRes.data.playbooks || []);
        } catch (discError) {
          console.warn('Could not discover filesystem playbooks:', discError);
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleImportPlaybooks = async () => {
    try {
      setImporting(true);
      const response = await ansibleAPI.importPlaybooks();
      toast.success(response.data.message || `Imported ${response.data.imported} playbooks`);
      
      // Refresh playbooks list
      const playbooksRes = await ansibleAPI.getPlaybooks();
      setPlaybooks(playbooksRes.data.playbooks || []);
      
      // Refresh filesystem discovery
      const discoveryRes = await ansibleAPI.discoverPlaybooks();
      setFilesystemPlaybooks(discoveryRes.data.playbooks || []);
    } catch (error) {
      toast.error('Failed to import playbooks: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePlaybook = async (playbookId) => {
    try {
      await ansibleAPI.deletePlaybook(playbookId);
      setPlaybooks(playbooks.filter(p => p.id !== playbookId));
      toast.success('Playbook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete playbook');
    }
  };

  const handleDeleteInventory = async (inventoryId) => {
    try {
      await ansibleAPI.deleteInventory(inventoryId);
      setInventories(inventories.filter(i => i.id !== inventoryId));
      toast.success('Inventory deleted successfully');
    } catch (error) {
      toast.error('Failed to delete inventory');
    }
  };

  const handleExecutePlaybook = async (playbookId, inventoryId) => {
    try {
      const response = await ansibleAPI.executePlaybook({
        playbook_id: playbookId,
        inventory_id: inventoryId
      });
      toast.success('Playbook execution started');
      // Refresh executions
      const executionsRes = await ansibleAPI.getExecutions();
      setExecutions(executionsRes.data.executions || []);
    } catch (error) {
      toast.error('Failed to execute playbook');
    }
  };

  const handleExecuteAnsibleWorkflow = async (playbookId, inventoryId) => {
    try {
      // Use the correct API endpoint for executing Ansible playbooks
      const response = await ansibleAPI.executePlaybook({
        playbook_id: playbookId,
        inventory_id: inventoryId
      });
      toast.success('Ansible workflow execution started');
      // Refresh executions
      const executionsRes = await ansibleAPI.getExecutions();
      setExecutions(executionsRes.data.executions || []);
      // Navigate to execution detail page
      navigate(`/ansible-execution-detail/${response.data.execution_id}`);
    } catch (error) {
      toast.error('Failed to execute Ansible workflow: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ansible Workflows</h1>
          <p className="mt-2 text-gray-600">
            Manage Ansible playbooks, inventories, and executions
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'playbooks', name: 'Playbooks', icon: DocumentTextIcon },
                { key: 'inventories', name: 'Inventories', icon: DocumentDuplicateIcon },
                { key: 'executions', name: 'Executions', icon: PlayIcon },
                { key: 'api-docs', name: 'API Documentation', icon: CodeBracketIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Playbooks Tab */}
        {activeTab === 'playbooks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Playbooks</h2>
              <div className="flex space-x-3">
                <button
                  onClick={handleImportPlaybooks}
                  disabled={importing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${importing ? 'animate-spin' : ''}`} />
                  {importing ? 'Importing...' : 'Import from Filesystem'}
                </button>
                <button
                  onClick={() => navigate('/ansible-playbook-create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Playbook
                </button>
              </div>
            </div>

            {/* Filesystem Playbooks Info */}
            {filesystemPlaybooks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">
                      {filesystemPlaybooks.length} playbook(s) found in filesystem
                    </span>
                  </div>
                  <button
                    onClick={handleImportPlaybooks}
                    disabled={importing}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Import All
                  </button>
                </div>
              </div>
            )}

            {/* Execute Playbook Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execute Playbook</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Playbook</label>
                  <select
                    value={selectedPlaybookId || ''}
                    onChange={(e) => setSelectedPlaybookId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a playbook...</option>
                    {playbooks.map((playbook) => (
                      <option key={playbook.id} value={playbook.id}>{playbook.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Inventory</label>
                  <select
                    value={selectedInventoryId || ''}
                    onChange={(e) => setSelectedInventoryId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose an inventory...</option>
                    {inventories.map((inventory) => (
                      <option key={inventory.id} value={inventory.id}>{inventory.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => handleExecuteAnsibleWorkflow(selectedPlaybookId, selectedInventoryId)}
                  disabled={!selectedPlaybookId || !selectedInventoryId}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    selectedPlaybookId && selectedInventoryId
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Execute Workflow
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playbooks.map((playbook) => (
                <div key={playbook.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{playbook.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{playbook.description}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2 relative z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/ansible-playbook-edit/${playbook.id}`); }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 hover:bg-gray-100 rounded"
                        title="Edit Playbook"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeletePlaybook(playbook.id); }}
                        className="text-gray-400 hover:text-red-600 cursor-pointer p-1 hover:bg-red-50 rounded"
                        title="Delete Playbook"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Tags:</span>
                      <span>{playbook.tags_list?.length || 0}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {playbook.tags_list?.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Created by: {playbook.created_by_username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(playbook.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 flex space-x-3 relative z-20">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/ansible-playbook-view/${playbook.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors duration-200"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/ansible-playbook-edit/${playbook.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer hover:border-blue-400 transition-colors duration-200"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleExecuteAnsibleWorkflow(playbook.id, null); }}
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer hover:border-green-400 transition-colors duration-200"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Execute
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {playbooks.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Playbooks Yet</h3>
                <p className="text-gray-600 mb-6">Create your first Ansible playbook to get started.</p>
                <button
                  onClick={() => navigate('/ansible-playbook-create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Playbook
                </button>
              </div>
            )}
          </div>
        )}

        {/* Inventories Tab */}
        {activeTab === 'inventories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Inventories</h2>
              <button
                onClick={() => navigate('/ansible-inventory-create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Inventory
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventories.map((inventory) => (
                <div key={inventory.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{inventory.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{inventory.description}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2 relative z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/ansible-inventory-edit/${inventory.id}`); }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 hover:bg-gray-100 rounded"
                        title="Edit Inventory"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteInventory(inventory.id); }}
                        className="text-gray-400 hover:text-red-600 cursor-pointer p-1 hover:bg-red-50 rounded"
                        title="Delete Inventory"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Type:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        inventory.inventory_type === 'static'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {inventory.inventory_type}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Created by: {inventory.created_by_username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(inventory.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 flex space-x-3 relative z-20">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/ansible-inventory-view/${inventory.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors duration-200"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/ansible-inventory-edit/${inventory.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer hover:border-green-400 transition-colors duration-200"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {inventories.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventories Yet</h3>
                <p className="text-gray-600 mb-6">Create your first Ansible inventory to get started.</p>
                <button
                  onClick={() => navigate('/ansible-inventory-create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Inventory
                </button>
              </div>
            )}
          </div>
        )}

        {/* Executions Tab */}
        {activeTab === 'executions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Executions</h2>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Playbook
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inventory
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {executions.map((execution) => (
                      <tr key={execution.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {execution.playbook_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {execution.playbook_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {execution.inventory_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {execution.inventory_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            execution.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : execution.status === 'running'
                              ? 'bg-yellow-100 text-yellow-800'
                              : execution.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {execution.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {execution.started_at ? new Date(execution.started_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {execution.execution_time ? `${execution.execution_time}s` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/ansible-execution-detail/${execution.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {executions.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <PlayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Executions Yet</h3>
                  <p className="text-gray-600 mb-6">Execute an Ansible playbook to see execution results.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Documentation Tab */}
        {activeTab === 'api-docs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">API Documentation</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-blue-800 text-sm font-medium">New Feature</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <CodeBracketIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Device-Specific Execution API</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Enhanced - ID or Name
                </span>
              </div>
              
              <div className="space-y-6">
                {/* Endpoint Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Endpoint</h4>
                  <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                    <span className="text-green-600">POST</span> /api/automation/ansible/execute-on-device/
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-600">
                    Execute stored Ansible playbooks programmatically on specific network devices. This endpoint accepts device ID and either playbook ID or playbook name to retrieve YAML content from the database, along with JSON variables for automated configuration and management tasks.
                  </p>
                </div>

                {/* Request Format */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Request Format</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                    <pre>{`{
  "device_id": "uuid-string",           // Required: Device UUID from database
  "playbook_id": "uuid-string",         // Optional: Ansible playbook UUID from database
  "playbook_name": "string",            // Optional: Ansible playbook name from database
  "variables": {},                      // Optional: JSON object with variables
  "tags": [],                          // Optional: List of tags to run
  "skip_tags": []                      // Optional: List of tags to skip
}`}</pre>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Note:</strong> Provide either <code className="bg-gray-200 px-1 rounded">playbook_id</code> OR <code className="bg-gray-200 px-1 rounded">playbook_name</code>, not both.
                  </div>
                </div>

                {/* Example Usage */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Example Usage</h4>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Using Playbook ID (Recommended)</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_id": "456e7890-e89b-12d3-a456-426614174001",
       "variables": {"custom_var": "value"}
     }'`}</pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Using Playbook Name</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_name": "network-config-playbook",
       "variables": {"custom_var": "value"}
     }'`}</pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">With Custom Variables</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_name": "interface-configuration",
       "variables": {
         "interface_name": "GigabitEthernet0/1",
         "vlan_id": "100",
         "custom_setting": "production"
       }
     }'`}</pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">With Tags</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/automation/ansible/execute-on-device/ \\
     -H "Content-Type: application/json" \\
     -d '{
       "device_id": "123e4567-e89b-12d3-a456-426614174000",
       "playbook_id": "456e7890-e89b-12d3-a456-426614174001",
       "variables": {"test_mode": true},
       "tags": ["configuration", "testing"]
     }'`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Format */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Success Response</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                    <pre>{`{
  "success": true,
  "execution_time": 12.5,
  "return_code": 0,
  "device_info": {
    "name": "Router-01",
    "hostname": "router01.example.com",
    "ip_address": "192.168.1.1",
    "device_type": "router",
    "vendor": "Cisco"
  },
  "playbook_info": {
    "valid": true,
    "plays": 1
  },
  "variables_used": {
    "device_name": "Router-01",
    "device_hostname": "router01.example.com",
    "device_ip": "192.168.1.1",
    "device_type": "router",
    "device_vendor": "Cisco",
    "custom_var_1": "Test Value 1"
  },
  "result": "ansible-playbook output...",
  "stdout": "execution output...",
  "stderr": ""
}`}</pre>
                  </div>
                </div>

                {/* Available Variables */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Automatic Variables</h4>
                  <p className="text-gray-600 mb-3">
                    The following variables are automatically available in all playbooks:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-800 mb-2">Device Information</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li><code className="bg-gray-200 px-1 rounded">device_name</code> - Name of the target device</li>
                        <li><code className="bg-gray-200 px-1 rounded">device_hostname</code> - Hostname of the device</li>
                        <li><code className="bg-gray-200 px-1 rounded">device_ip</code> - IP address of the device</li>
                        <li><code className="bg-gray-200 px-1 rounded">device_type</code> - Type of device (router, switch, etc.)</li>
                        <li><code className="bg-gray-200 px-1 rounded">device_vendor</code> - Device vendor information</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-800 mb-2">Custom Variables</h5>
                      <p className="text-sm text-gray-600">
                        Plus any custom variables provided in the request payload.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Key Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Device-specific targeting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Dynamic variable support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Playbook stored in database</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Support for ID or name lookup</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">CORS support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Comprehensive error handling</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Automatic inventory generation</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Handling */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Error Handling</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="font-medium text-red-800 mb-2">Common Error Responses</h5>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li><strong>400 Bad Request:</strong> Missing device_id or both playbook_id and playbook_name</li>
                      <li><strong>400 Bad Request:</strong> Both playbook_id and playbook_name provided</li>
                      <li><strong>404 Not Found:</strong> Device, playbook ID, or playbook name doesn't exist</li>
                      <li><strong>500 Internal Server Error:</strong> Execution timeout or system error</li>
                    </ul>
                  </div>
                </div>

                {/* Test Script */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Test Script</h4>
                  <p className="text-gray-600 mb-3">
                    A comprehensive test script is available at <code className="bg-gray-200 px-2 py-1 rounded">test_ansible_device_api.py</code>
                    with examples and documentation.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <BookOpenIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">Full Documentation</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-2">
                      See <code className="bg-blue-100 px-1 rounded">ANSIBLE_DEVICE_API_DOCUMENTATION.md</code> for complete API documentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnsibleWorkflows;
