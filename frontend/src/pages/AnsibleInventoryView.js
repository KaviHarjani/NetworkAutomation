import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsibleInventoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await ansibleAPI.getInventory(id);
        setInventory(response.data);
      } catch (error) {
        toast.error('Failed to load inventory');
        navigate('/ansible-workflows');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

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

  if (!inventory) {
    return null;
  }

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // API endpoint information
  const apiEndpoints = [
    {
      name: 'Get Inventory Details',
      method: 'GET',
      endpoint: `/api/ansible-inventories/${id}/`,
      description: 'Retrieve details of this inventory',
      curl: `curl -X GET "${baseUrl}/api/ansible-inventories/${id}/" -H "Content-Type: application/json" -H "Cookie: sessionid=<your-session-id>"`
    },
    {
      name: 'Update Inventory',
      method: 'PUT',
      endpoint: `/api/ansible-inventories/${id}/`,
      description: 'Update this inventory',
      curl: `curl -X PUT "${baseUrl}/api/ansible-inventories/${id}/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"name": "${inventory.name}", "inventory_content": "..."}'`
    },
    {
      name: 'Delete Inventory',
      method: 'DELETE',
      endpoint: `/api/ansible-inventories/${id}/`,
      description: 'Delete this inventory',
      curl: `curl -X DELETE "${baseUrl}/api/ansible-inventories/${id}/" -H "X-CSRFToken: <csrf-token>"`
    },
    {
      name: 'Validate Inventory',
      method: 'POST',
      endpoint: `/api/ansible-inventories/validate/`,
      description: 'Validate inventory syntax',
      curl: `curl -X POST "${baseUrl}/api/ansible-inventories/validate/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"inventory_content": "..."}'`
    },
    {
      name: 'List All Inventories',
      method: 'GET',
      endpoint: `/api/ansible-inventories/`,
      description: 'Get all inventories',
      curl: `curl -X GET "${baseUrl}/api/ansible-inventories/" -H "Content-Type: application/json" -H "Cookie: sessionid=<your-session-id>"`
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
              <h1 className="text-3xl font-bold text-gray-900">{inventory.name}</h1>
              <p className="mt-1 text-gray-600">{inventory.description}</p>
            </div>
            <button
              onClick={() => navigate(`/ansible-inventory-edit/${id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </button>
          </div>
        </div>

        {/* Inventory Details */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Details</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">ID</label>
                <p className="mt-1 text-sm text-gray-900">{inventory.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Type</label>
                <span className={`mt-1 inline-flex px-2 py-1 rounded text-xs font-medium ${
                  inventory.inventory_type === 'static'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {inventory.inventory_type}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{inventory.created_by_username || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(inventory.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(inventory.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Content */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Content</h2>
            <button
              onClick={() => copyToClipboard(inventory.inventory_content)}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <div className="px-6 py-4">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {inventory.inventory_content}
            </pre>
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Endpoints</h2>
            <p className="text-sm text-gray-500 mt-1">Use these endpoints to interact with this inventory programmatically</p>
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

export default AnsibleInventoryView;
