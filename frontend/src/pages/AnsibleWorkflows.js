import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PlayIcon, DocumentTextIcon, DocumentDuplicateIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsibleWorkflows = () => {
  const navigate = useNavigate();
  const [playbooks, setPlaybooks] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('playbooks');

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
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
                { key: 'executions', name: 'Executions', icon: PlayIcon }
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
              <button
                onClick={() => navigate('/ansible-playbook-create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Playbook
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playbooks.map((playbook) => (
                <div key={playbook.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{playbook.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{playbook.description}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/ansible-playbook-edit/${playbook.id}`)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlaybook(playbook.id)}
                        className="text-gray-400 hover:text-red-600"
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

                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => navigate(`/ansible-playbook-view/${playbook.id}`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View
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
                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/ansible-inventory-edit/${inventory.id}`)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInventory(inventory.id)}
                        className="text-gray-400 hover:text-red-600"
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

                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => navigate(`/ansible-inventory-view/${inventory.id}`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View
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
      </div>
    </div>
  );
};

export default AnsibleWorkflows;