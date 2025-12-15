import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, PlayIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsiblePlaybookView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playbook, setPlaybook] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInventory, setSelectedInventory] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [playbookRes, inventoriesRes] = await Promise.all([
          ansibleAPI.getPlaybook(id),
          ansibleAPI.getInventories()
        ]);
        setPlaybook(playbookRes.data);
        setInventories(inventoriesRes.data.inventories || []);
      } catch (error) {
        toast.error('Failed to load playbook');
        navigate('/ansible-workflows');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleExecute = async () => {
    if (!selectedInventory) {
      toast.error('Please select an inventory');
      return;
    }
    try {
      await ansibleAPI.executePlaybook({
        playbook_id: id,
        inventory_id: selectedInventory
      });
      toast.success('Playbook execution started');
      navigate('/ansible-workflows');
    } catch (error) {
      toast.error('Failed to execute playbook');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playbook) {
    return null;
  }

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // API endpoint information
  const apiEndpoints = [
    {
      name: 'Get Playbook Details',
      method: 'GET',
      endpoint: `/api/ansible-playbooks/${id}/`,
      description: 'Retrieve details of this playbook',
      curl: `curl -X GET "${baseUrl}/api/ansible-playbooks/${id}/" -H "Content-Type: application/json" -H "Cookie: sessionid=<your-session-id>"`
    },
    {
      name: 'Update Playbook',
      method: 'PUT',
      endpoint: `/api/ansible-playbooks/${id}/`,
      description: 'Update this playbook',
      curl: `curl -X PUT "${baseUrl}/api/ansible-playbooks/${id}/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"name": "${playbook.name}", "playbook_content": "..."}'`
    },
    {
      name: 'Delete Playbook',
      method: 'DELETE',
      endpoint: `/api/ansible-playbooks/${id}/`,
      description: 'Delete this playbook',
      curl: `curl -X DELETE "${baseUrl}/api/ansible-playbooks/${id}/" -H "X-CSRFToken: <csrf-token>"`
    },
    {
      name: 'Execute Playbook',
      method: 'POST',
      endpoint: `/api/ansible-executions/execute/`,
      description: 'Execute this playbook with an inventory',
      curl: `curl -X POST "${baseUrl}/api/ansible-executions/execute/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"playbook_id": ${id}, "inventory_id": <inventory-id>}'`
    },
    {
      name: 'Validate Playbook',
      method: 'POST',
      endpoint: `/api/ansible-playbooks/validate/`,
      description: 'Validate playbook YAML syntax',
      curl: `curl -X POST "${baseUrl}/api/ansible-playbooks/validate/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"playbook_content": "..."}'`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/ansible-workflows')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Ansible Workflows
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{playbook.name}</h1>
              <p className="mt-1 text-gray-600">{playbook.description}</p>
            </div>
            <button
              onClick={() => navigate(`/ansible-playbook-edit/${id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </button>
          </div>
        </div>

        {/* Playbook Details */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Playbook Details</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">ID</label>
                <p className="mt-1 text-sm text-gray-900">{playbook.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{playbook.created_by_username || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(playbook.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(playbook.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
            
            {playbook.tags_list && playbook.tags_list.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {playbook.tags_list.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Playbook Content */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Playbook Content (YAML)</h2>
            <button
              onClick={() => copyToClipboard(playbook.playbook_content)}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <div className="px-6 py-4">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {playbook.playbook_content}
            </pre>
          </div>
        </div>

        {/* Execute Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Execute Playbook</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Inventory
                </label>
                <select
                  value={selectedInventory}
                  onChange={(e) => setSelectedInventory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an inventory...</option>
                  {inventories.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExecute}
                disabled={!selectedInventory}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Execute
              </button>
            </div>
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Endpoints</h2>
            <p className="text-sm text-gray-500 mt-1">Use these endpoints to interact with this playbook programmatically</p>
          </div>
          <div className="divide-y divide-gray-200">
            {apiEndpoints.map((api, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      api.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      api.method === 'POST' ? 'bg-green-100 text-green-800' :
                      api.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {api.method}
                    </span>
                    <span className="font-medium text-gray-900">{api.name}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(api.curl)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Copy cURL
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">{api.description}</p>
                <code className="block bg-gray-100 px-3 py-2 rounded text-sm text-gray-800 font-mono">
                  {api.endpoint}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnsiblePlaybookView;
