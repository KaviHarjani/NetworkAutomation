import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CodeBracketIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { chefAPI } from '../services/api';

const ChefCookbookCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cookbook_content: `# Cookbook: {{cookbook_name}}
# Description: {{cookbook_description}}
# Version: 1.0.0
# Author: Network Automation

name '{{cookbook_name}}'
description '{{cookbook_description}}'
version '1.0.0'
chef_version '>= 16.0'

# Basic attributes
default['{{cookbook_name}}']['version'] = '1.0.0'
default['{{cookbook_name}}']['install_dir'] = '/opt/{{cookbook_name}}'
default['{{cookbook_name}}']['config_dir'] = '/etc/{{cookbook_name}}'
default['{{cookbook_name}}']['log_dir'] = '/var/log/{{cookbook_name}}'

# Service configuration
default['{{cookbook_name}}']['service']['name'] = '{{cookbook_name}}'
default['{{cookbook_name}}']['service']['user'] = '{{cookbook_name}}'
default['{{cookbook_name}}']['service']['group'] = '{{cookbook_name}}'

# Network configuration
default['{{cookbook_name}}']['network']['listen_address'] = '0.0.0.0'
default['{{cookbook_name}}']['network']['port'] = 8080

# Dependencies
depends 'apt', '>= 7.0'
depends 'yum', '>= 6.0'`,
    attributes: `{
  "version": "1.0.0",
  "install_dir": "/opt/network-app",
  "config_dir": "/etc/network-app",
  "log_dir": "/var/log/network-app",
  "service": {
    "name": "network-app",
    "user": "network-app",
    "group": "network-app"
  },
  "network": {
    "listen_address": "0.0.0.0",
    "port": 8080
  }
}`
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValidate = async () => {
    try {
      const response = await chefAPI.validateCookbook(formData.cookbook_content);
      setValidationResult(response.data);
      if (response.data.valid) {
        toast.success('Cookbook is valid!');
      } else {
        toast.error('Cookbook validation failed');
      }
    } catch (error) {
      toast.error('Validation failed');
      setValidationResult({ valid: false, error: 'Validation service unavailable' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Cookbook name is required');
      return;
    }

    if (!formData.cookbook_content.trim()) {
      toast.error('Cookbook content is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse attributes
      let attributesObj = {};
      try {
        attributesObj = JSON.parse(formData.attributes);
      } catch (error) {
        toast.error('Invalid JSON in attributes field');
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        name: formData.name,
        description: formData.description,
        cookbook_content: formData.cookbook_content,
        attributes: attributesObj
      };

      await chefAPI.createCookbook(submitData);
      toast.success('Cookbook created successfully!');
      navigate('/chef-workflows');
    } catch (error) {
      toast.error('Failed to create cookbook');
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
            onClick={() => navigate('/chef-workflows')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Chef Workflows
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Create Chef Cookbook</h1>
          <p className="mt-2 text-gray-600">
            Create a new Chef cookbook with Ruby metadata and configuration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cookbook Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter cookbook name"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter cookbook description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Attributes (JSON)
                </label>
                <textarea
                  value={formData.attributes}
                  onChange={(e) => handleInputChange('attributes', e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder={`{
  "version": "1.0.0",
  "install_dir": "/opt/myapp",
  "config_dir": "/etc/myapp",
  "service": {
    "name": "myapp",
    "user": "myapp"
  }
}`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Attributes can be referenced in recipes using <code className="bg-gray-200 px-1 rounded">node['cookbook']['attribute']</code> syntax.
                  Example: <code className="bg-gray-200 px-1 rounded">node['myapp']['version']</code>
                </p>
              </div>
            </div>
          </div>

          {/* Cookbook Content */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Cookbook Metadata (metadata.rb)</h2>
              <button
                type="button"
                onClick={handleValidate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <CodeBracketIcon className="w-4 h-4 mr-2" />
                Validate Ruby
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                required
                value={formData.cookbook_content}
                onChange={(e) => handleInputChange('cookbook_content', e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Enter your Chef cookbook metadata.rb content here..."
              />

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
                      {validationResult.valid ? 'Valid Ruby' : 'Invalid Ruby'}
                    </span>
                  </div>
                  {validationResult.error && (
                    <p className="mt-2 text-sm text-red-700">{validationResult.error}</p>
                  )}
                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/chef-workflows')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Cookbook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChefCookbookCreate;