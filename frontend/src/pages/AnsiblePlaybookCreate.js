import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CodeBracketIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsiblePlaybookCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    playbook_content: `---
- name: Web Server Setup
  hosts: webservers
  become: true
  vars:
    web_port: "{{ nginx_port | default(80) }}"
    app_name: "{{ app_name | default('MyApp') }}"

  tasks:
    - name: Update package cache
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"

    - name: Install nginx
      apt:
        name: nginx
        state: present
      when: ansible_os_family == "Debian"

    - name: Install httpd
      yum:
        name: httpd
        state: present
      when: ansible_os_family == "RedHat"

    - name: Create web root directory
      file:
        path: /var/www/html
        state: directory
        mode: '0755'

    - name: Copy custom index.html
      copy:
        content: |
          <!DOCTYPE html>
          <html>
          <head>
            <title>{{ app_name }} - {{ ansible_hostname }}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1 { color: #333; }
              .info { background: #f0f0f0; padding: 10px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Welcome to {{ app_name }}</h1>
            <div class="info">
              <p><strong>Server:</strong> {{ ansible_hostname }}</p>
              <p><strong>OS:</strong> {{ ansible_distribution }} {{ ansible_distribution_version }}</p>
              <p><strong>IP Address:</strong> {{ ansible_default_ipv4.address }}</p>
              <p><strong>Web Port:</strong> {{ web_port }}</p>
              <p><strong>Timestamp:</strong> {{ ansible_date_time.iso8601 }}</p>
            </div>
          </body>
          </html>
        dest: /var/www/html/index.html
        mode: '0644'

    - name: Configure nginx for custom port
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-available/default
      when: ansible_os_family == "Debian"
      notify: Restart nginx

    - name: Start and enable nginx
      service:
        name: nginx
        state: started
        enabled: true
      when: ansible_os_family == "Debian"

    - name: Start and enable httpd
      service:
        name: httpd
        state: started
        enabled: true
      when: ansible_os_family == "RedHat"

  handlers:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted`,
    tags: 'web,nginx,deployment',
    variables: `{
  "nginx_port": 8080,
  "app_name": "Network Automation Demo",
  "web_root": "/var/www/html",
  "config_backup": true
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
      const response = await ansibleAPI.validatePlaybook(formData.playbook_content);
      setValidationResult(response.data);
      if (response.data.valid) {
        toast.success('Playbook is valid!');
      } else {
        toast.error('Playbook validation failed');
      }
    } catch (error) {
      toast.error('Validation failed');
      setValidationResult({ valid: false, error: 'Validation service unavailable' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Playbook name is required');
      return;
    }

    if (!formData.playbook_content.trim()) {
      toast.error('Playbook content is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse tags
      let tagsList = [];
      if (formData.tags.trim()) {
        tagsList = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      // Parse variables
      let variablesObj = {};
      try {
        variablesObj = JSON.parse(formData.variables);
      } catch (error) {
        toast.error('Invalid JSON in variables field');
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        name: formData.name,
        description: formData.description,
        playbook_content: formData.playbook_content,
        tags: tagsList,
        variables: variablesObj
      };

      await ansibleAPI.createPlaybook(submitData);
      toast.success('Playbook created successfully!');
      navigate('/ansible-workflows');
    } catch (error) {
      toast.error('Failed to create playbook');
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

          <h1 className="text-3xl font-bold text-gray-900">Create Ansible Playbook</h1>
          <p className="mt-2 text-gray-600">
            Create a new Ansible playbook with YAML content and configuration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Playbook Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter playbook name"
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
                  placeholder="Enter playbook description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="web, nginx, deployment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Variables (JSON)
                </label>
                <textarea
                  value={formData.variables}
                  onChange={(e) => handleInputChange('variables', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder={`{
  "nginx_port": 8080,
  "app_name": "My Web App",
  "web_root": "/var/www/html",
  "backup_enabled": true
}`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Variables can be referenced in playbooks using {"{{ variable_name }}"} syntax.
                  Example: {"{{ nginx_port | default(80) }}"} uses the variable or defaults to 80.
                </p>
              </div>
            </div>
          </div>

          {/* Playbook Content */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Playbook Content</h2>
              <button
                type="button"
                onClick={handleValidate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <CodeBracketIcon className="w-4 h-4 mr-2" />
                Validate YAML
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                required
                value={formData.playbook_content}
                onChange={(e) => handleInputChange('playbook_content', e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Enter your Ansible playbook YAML content here..."
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
                      {validationResult.valid ? 'Valid YAML' : 'Invalid YAML'}
                    </span>
                  </div>
                  {validationResult.error && (
                    <p className="mt-2 text-sm text-red-700">{validationResult.error}</p>
                  )}
                  {validationResult.valid && validationResult.plays && (
                    <p className="mt-2 text-sm text-green-700">
                      Found {validationResult.plays} play{validationResult.plays !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Playbook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnsiblePlaybookCreate;