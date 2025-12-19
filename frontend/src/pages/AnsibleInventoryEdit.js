import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  CodeBracketIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsibleInventoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [showExamples, setShowExamples] = useState(false);
  const [showApiExamples, setShowApiExamples] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inventory_content: '',
    inventory_type: 'static',
    group_variables_dict: {},
    host_variables_dict: {}
  });

  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const response = await ansibleAPI.getInventory(id);
        const inventory = response.data;
        setFormData({
          name: inventory.name || '',
          description: inventory.description || '',
          inventory_content: inventory.inventory_content || '',
          inventory_type: inventory.inventory_type || 'static',
          group_variables_dict: inventory.group_variables_dict || {},
          host_variables_dict: inventory.host_variables_dict || {}
        });
      } catch (error) {
        toast.error('Failed to load inventory');
        navigate('/ansible-workflows');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, [id, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVariableChange = (type, key, value) => {
    setFormData(prev => ({
      ...prev,
      [`${type}_variables_dict`]: {
        ...prev[`${type}_variables_dict`],
        [key]: value
      }
    }));
  };

  const addVariable = (type) => {
    const timestamp = Date.now();
    setFormData(prev => ({
      ...prev,
      [`${type}_variables_dict`]: {
        ...prev[`${type}_variables_dict`],
        [`variable_${timestamp}`]: ''
      }
    }));
  };

  const removeVariable = (type, key) => {
    setFormData(prev => {
      const newVars = { ...prev[`${type}_variables_dict`] };
      delete newVars[key];
      return {
        ...prev,
        [`${type}_variables_dict`]: newVars
      };
    });
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
      const submitData = {
        name: formData.name,
        description: formData.description,
        inventory_content: formData.inventory_content,
        inventory_type: formData.inventory_type,
        group_variables_dict: formData.group_variables_dict,
        host_variables_dict: formData.host_variables_dict
      };

      await ansibleAPI.updateInventory(id, submitData);
      toast.success('Inventory updated successfully!');
      navigate('/ansible-workflows');
    } catch (error) {
      toast.error('Failed to update inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getExampleInventory = () => {
    return `# Example Ansible Inventory (YAML format)
all:
  children:
    web_servers:
      hosts:
        web1.example.com:
          ansible_host: 192.168.1.10
          ansible_user: admin
          ansible_ssh_private_key_file: ~/.ssh/id_rsa
          http_port: 80
          ssl_enabled: false
        web2.example.com:
          ansible_host: 192.168.1.11
          ansible_user: admin
          ansible_ssh_private_key_file: ~/.ssh/id_rsa
          http_port: 443
          ssl_enabled: true
      vars:
        ntp_server: pool.ntp.org
        domain: example.com
    
    database_servers:
      hosts:
        db1.example.com:
          ansible_host: 192.168.1.20
          ansible_user: dba
          db_port: 5432
          db_size: 100GB
      vars:
        db_version: "14"
        backup_enabled: true`;
  };

  const getVariableExamples = () => {
    return {
      group: {
        description: "Variables that apply to all hosts in a group",
        examples: [
          { key: "ntp_server", value: "pool.ntp.org", description: "NTP server for time synchronization" },
          { key: "domain", value: "example.com", description: "DNS domain for the environment" },
          { key: "ntp_servers", value: ["pool.ntp.org", "time.google.com"], description: "List of NTP servers" }
        ]
      },
      host: {
        description: "Variables specific to individual hosts",
        examples: [
          { key: "ansible_host", value: "192.168.1.10", description: "IP address for SSH connection" },
          { key: "ansible_user", value: "admin", description: "Username for SSH authentication" },
          { key: "http_port", value: "80", description: "HTTP port for web server" },
          { key: "db_port", value: "5432", description: "Database connection port" }
        ]
      }
    };
  };

  const getApiExamples = () => {
    return {
      create: `curl -X POST "http://localhost:8000/api/ansible-inventories/" \\
  -H "Content-Type: application/json" \\
  -H "X-CSRFToken: YOUR_CSRF_TOKEN" \\
  -d '{
    "name": "Production Servers",
    "description": "Production environment servers",
    "inventory_type": "static",
    "inventory_content": "${getExampleInventory().replace(/\n/g, '\\n')}",
    "group_variables_dict": {
      "ntp_server": "pool.ntp.org",
      "domain": "example.com"
    },
    "host_variables_dict": {
      "ansible_host": "192.168.1.10",
      "ansible_user": "admin"
    }
  }'`,
      
      execute: `curl -X POST "http://localhost:8000/api/ansible-executions/execute/" \\
  -H "Content-Type: application/json" \\
  -H "X-CSRFToken: YOUR_CSRF_TOKEN" \\
  -d '{
    "playbook_id": "PLAYBOOK_UUID",
    "inventory_id": "INVENTORY_UUID",
    "extra_vars_dict": {
      "target_environment": "production",
      "deployment_version": "1.0.0"
    },
    "tags_list": ["deploy", "configure"]
  }'`
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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

  const variableExamples = getVariableExamples();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/ansible-workflows')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Ansible Workflows
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Edit Ansible Inventory</h1>
          <p className="mt-2 text-gray-600">
            Update the inventory configuration, hosts, and variables
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
                  <option value="static">Static</option>
                  <option value="dynamic">Dynamic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'content', name: 'Inventory Content' },
                  { id: 'variables', name: 'Variables' },
                  { id: 'examples', name: 'Examples & Documentation' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Inventory Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Inventory Content</h3>
                    <button
                      type="button"
                      onClick={handleValidate}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <CodeBracketIcon className="w-4 h-4 mr-2" />
                      Validate
                    </button>
                  </div>

                  <textarea
                    required
                    value={formData.inventory_content}
                    onChange={(e) => handleInputChange('inventory_content', e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                    placeholder="Enter your Ansible inventory content here (YAML or INI format)..."
                  />

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
                    </div>
                  )}
                </div>
              )}

              {/* Variables Tab */}
              {activeTab === 'variables' && (
                <div className="space-y-6">
                  {/* Group Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Group Variables</h3>
                      <button
                        type="button"
                        onClick={() => addVariable('group')}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Add Variable
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Variables that apply to all hosts in a group. These are typically configuration settings.
                    </p>
                    
                    <div className="space-y-3">
                      {Object.entries(formData.group_variables_dict).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newKey = e.target.value;
                              const currentValue = formData.group_variables_dict[key];
                              const newVars = { ...formData.group_variables_dict };
                              delete newVars[key];
                              newVars[newKey] = currentValue;
                              setFormData(prev => ({ ...prev, group_variables_dict: newVars }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="variable_name"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleVariableChange('group', key, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="variable_value"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariable('group', key)}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      {Object.keys(formData.group_variables_dict).length === 0 && (
                        <p className="text-gray-500 italic">No group variables defined</p>
                      )}
                    </div>
                  </div>

                  {/* Host Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Host Variables</h3>
                      <button
                        type="button"
                        onClick={() => addVariable('host')}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Add Variable
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Variables specific to individual hosts. These include connection details and host-specific settings.
                    </p>
                    
                    <div className="space-y-3">
                      {Object.entries(formData.host_variables_dict).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newKey = e.target.value;
                              const currentValue = formData.host_variables_dict[key];
                              const newVars = { ...formData.host_variables_dict };
                              delete newVars[key];
                              newVars[newKey] = currentValue;
                              setFormData(prev => ({ ...prev, host_variables_dict: newVars }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="variable_name"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleVariableChange('host', key, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="variable_value"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariable('host', key)}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      {Object.keys(formData.host_variables_dict).length === 0 && (
                        <p className="text-gray-500 italic">No host variables defined</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Examples Tab */}
              {activeTab === 'examples' && (
                <div className="space-y-6">
                  {/* Inventory Format Examples */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Format Examples</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-700">YAML Format (Recommended)</h4>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(getExampleInventory())}
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4 inline mr-1" />
                            Copy
                          </button>
                        </div>
                        <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                          <code>{getExampleInventory()}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Variable Usage Examples */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Variable Usage in Playbooks</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-start">
                          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                          <div>
                            <h4 className="font-medium text-blue-900">How Variables Work</h4>
                            <p className="text-sm text-blue-800 mt-1">
                              Variables defined in your inventory can be referenced in Ansible playbooks using Jinja2 syntax. 
                              Group variables apply to all hosts in a group, while host variables are specific to individual hosts.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Example Playbook Usage</h4>
                        <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                          <code>{`- name: Configure web servers
  hosts: web_servers
  become: yes
  tasks:
    - name: Configure NTP
      template:
        src: ntp.conf.j2
        dest: /etc/ntp.conf
      vars:
        ntp_servers: "{{ ntp_server }}"
    
    - name: Set up domain configuration
      copy:
        content: "DOMAIN={{ domain }}"
        dest: /etc/domain.conf
    
    - name: Configure HTTP port
      lineinfile:
        path: /etc/httpd/conf/httpd.conf
        regexp: '^Listen '
        line: "Listen {{ http_port }}"
      when: ansible_host == "192.168.1.10"`}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* API Examples */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">API Examples</h3>
                      <button
                        type="button"
                        onClick={() => setShowApiExamples(!showApiExamples)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        {showApiExamples ? <EyeSlashIcon className="w-4 h-4 inline mr-1" /> : <EyeIcon className="w-4 h-4 inline mr-1" />}
                        {showApiExamples ? 'Hide' : 'Show'} API Examples
                      </button>
                    </div>

                    {showApiExamples && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-700">Create Inventory (cURL)</h4>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(getApiExamples().create)}
                              className="text-sm text-green-600 hover:text-green-800"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4 inline mr-1" />
                              Copy
                            </button>
                          </div>
                          <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                            <code>{getApiExamples().create}</code>
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-700">Execute Playbook (cURL)</h4>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(getApiExamples().execute)}
                              className="text-sm text-green-600 hover:text-green-800"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4 inline mr-1" />
                              Copy
                            </button>
                          </div>
                          <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                            <code>{getApiExamples().execute}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnsibleInventoryEdit;
