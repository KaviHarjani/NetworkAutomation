import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CodeBracketIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsibleInventoryCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inventory_type: 'static',
    inventory_content: `[webservers]
web1 ansible_host=192.168.1.10 ansible_user=ubuntu
web2 ansible_host=192.168.1.11 ansible_user=ubuntu

[webservers:vars]
ansible_ssh_private_key_file=/path/to/key
ansible_python_interpreter=/usr/bin/python3

[dbservers]
db1 ansible_host=192.168.1.20 ansible_user=ubuntu

[dbservers:vars]
ansible_ssh_private_key_file=/path/to/key
ansible_python_interpreter=/usr/bin/python3

[all:vars]
ansible_ssh_common_args='-o StrictHostKeyChecking=no'`,
    group_variables: '{}',
    host_variables: '{}'
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValidate = async () => {
    try {
      const response = await ansibleAPI.validateInventory(formData.inventory_content);
      setValidationResult(response.data);
      if (response.data.valid) {
        toast.success('Inventory is valid!');
      } else {
        toast.error('Inventory validation failed');
      }
    } catch (error) {
      toast.error('Validation failed');
      setValidationResult({ valid: false, error: 'Validation service unavailable' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Inventory name is required');
      return;
    }

    if (!formData.inventory_content.trim()) {
      toast.error('Inventory content is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse variables
      let groupVariables = {};
      let hostVariables = {};

      try {
        groupVariables = JSON.parse(formData.group_variables);
        hostVariables = JSON.parse(formData.host_variables);
      } catch (error) {
        toast.error('Invalid JSON in variables fields');
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        name: formData.name,
        description: formData.description,
        inventory_type: formData.inventory_type,
        inventory_content: formData.inventory_content,
        group_variables: groupVariables,
        host_variables: hostVariables
      };

      await ansibleAPI.createInventory(submitData);
      toast.success('Inventory created successfully!');
      navigate('/ansible-workflows');
    } catch (error) {
      toast.error('Failed to create inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/ansible-workflows')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Ansible Workflows
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Create Ansible Inventory</h1>
          <p className="mt-2 text-gray-600">
            Create a new Ansible inventory with host definitions and variables
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inventory Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter inventory name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter inventory description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inventory Type
                </label>
                <select
                  value={formData.inventory_type}
                  onChange={(e) => handleInputChange('inventory_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="static">Static Inventory</option>
                  <option value="dynamic">Dynamic Inventory</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {formData.inventory_type === 'static'
                    ? 'Static inventory with predefined hosts and groups'
                    : 'Dynamic inventory script that generates inventory on demand'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Inventory Content */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Inventory Content</h2>
              <button
                type="button"
                onClick={handleValidate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <CodeBracketIcon className="w-4 h-4 mr-2" />
                Validate
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.inventory_type === 'static' ? 'INI/YAML Content' : 'Script Content'} *
                </label>
                <textarea
                  required
                  value={formData.inventory_content}
                  onChange={(e) => handleInputChange('inventory_content', e.target.value)}
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                  placeholder={
                    formData.inventory_type === 'static'
                      ? "[webservers]\nweb1 ansible_host=192.168.1.10\n\n[dbservers]\ndb1 ansible_host=192.168.1.20"
                      : "#!/bin/bash\necho '{\"_meta\": {\"hostvars\": {}}, \"all\": {\"hosts\": [\"localhost\"]}}'"
                  }
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.inventory_type === 'static'
                    ? 'Enter hosts and groups in INI or YAML format'
                    : 'Enter the dynamic inventory script content'
                  }
                </p>
              </div>

              {/* Validation Result */}
              {validationResult && (
                <div className={`p-4 rounded-md ${validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center">
                    {validationResult.valid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {validationResult.valid ? 'Valid Inventory' : 'Invalid Inventory'}
                    </span>
                  </div>
                  {validationResult.error && (
                    <p className="mt-2 text-sm text-red-700">{validationResult.error}</p>
                  )}
                  {validationResult.valid && (
                    <div className="mt-2 text-sm text-green-700">
                      {validationResult.groups && <p>Groups: {validationResult.groups}</p>}
                      {validationResult.hosts && <p>Hosts: {validationResult.hosts}</p>}
                      {validationResult.format && <p>Format: {validationResult.format}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Variables */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Variables</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Variables (JSON)
                </label>
                <textarea
                  value={formData.group_variables}
                  onChange={(e) => handleInputChange('group_variables', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                  placeholder='{"webservers": {"nginx_port": 80}, "dbservers": {"db_port": 5432}}'
                />
                <p className="mt-1 text-sm text-gray-500">
                  Variables applied to groups
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Host Variables (JSON)
                </label>
                <textarea
                  value={formData.host_variables}
                  onChange={(e) => handleInputChange('host_variables', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                  placeholder='{"web1": {"ansible_user": "ubuntu"}, "db1": {"ansible_user": "centos"}}'
                />
                <p className="mt-1 text-sm text-gray-500">
                  Variables applied to specific hosts
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/ansible-workflows')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnsibleInventoryCreate;