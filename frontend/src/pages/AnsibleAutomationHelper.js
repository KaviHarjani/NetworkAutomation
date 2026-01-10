import React, { useState } from 'react';
import {
  BookOpenIcon,
  CommandLineIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  ServerIcon,
  CloudIcon,
  KeyIcon,
  FolderIcon,
  BeakerIcon,
  LockClosedIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

const AnsibleAutomationHelper = () => {
  const [activeTab, setActiveTab] = useState('collections');

  const tabs = [
    { id: 'collections', name: 'Galaxy Collections', icon: BookOpenIcon },
    { id: 'device-types', name: 'Device Types', icon: DevicePhoneMobileIcon },
    { id: 'cli-commands', name: 'CLI Commands', icon: CommandLineIcon },
    { id: 'api-devices', name: 'API Devices', icon: CloudIcon },
    { id: 'templates', name: 'Templates', icon: ClipboardDocumentListIcon },
    { id: 'advanced', name: 'Advanced Concepts', icon: BeakerIcon },
  ];

  const deviceTypeCards = [
    {
      type: 'Devices with Python',
      icon: CpuChipIcon,
      color: 'bg-green-500',
      description: 'Full Ansible support with fact gathering',
      settings: 'gather_facts: true',
    },
    {
      type: 'Devices without Python',
      icon: ServerIcon,
      color: 'bg-yellow-500',
      description: 'Disable fact gathering, use CLI modules',
      settings: 'gather_facts: false',
    },
    {
      type: 'No Galaxy Collection',
      icon: CommandLineIcon,
      color: 'bg-orange-500',
      description: 'Use direct SSH with cli_command/raw modules',
      settings: 'ansible.netcommon.cli_command',
    },
    {
      type: 'API-only Devices',
      icon: CloudIcon,
      color: 'bg-blue-500',
      description: 'REST API automation with uri module',
      settings: 'ansible.netcommon.uri',
    },
  ];

  const commandExamples = {
    listCollections: `ansible-galaxy collection list
ansible-galaxy collection list --format json
ansible-doc -l cisco.ios`,
    playbookTemplate: `---
- name: Network Device Configuration
  hosts: all
  gather_facts: false
  
  tasks:
    - name: Configure interface
      cisco.ios.ios_config:
        lines:
          - description "Configured by Ansible"
        backup: yes`,
    apiTemplate: `---
- name: API-based device management
  hosts: api_switches
  gather_facts: false
  
  tasks:
    - name: Configure via REST API
      ansible.netcommon.uri:
        url: "https://{{ inventory_hostname }}/api/v1/interfaces/Gi0/1"
        method: PATCH
        headers:
          Content-Type: application/json
          Authorization: "Bearer {{ api_token }}"
        body:
          description: "Configured via API"
        body_format: json`,
    sshTemplate: `---
- name: Direct SSH Management for Legacy Devices
  hosts: legacy_switches
  gather_facts: false
  
  tasks:
    - name: Execute command via SSH
      ansible.builtin.raw: |
        configure terminal
        interface GigabitEthernet0/1
        description "Legacy device config"
        end
        write memory

    - name: Use cli_command for better control
      ansible.netcommon.cli_command:
        command: show version`,
  };

  const advancedExamples = {
    roleTemplate: `---
# roles/network_config/tasks/main.yml
- name: Configure network device
  cisco.ios.ios_config:
    lines: "{{ network_config_lines }}"
    parents: "{{ network_config_parents }}"
  when: network_config_lines is defined

# roles/network_config/vars/main.yml
---
network_config_vars:
  description: "Configured by Ansible"
  admin_state: up

# roles/network_config/defaults/main.yml
---
network_config_enabled: true`,
    vaultTemplate: `# Encrypt sensitive data
$ ansible-vault encrypt secrets.yml

# Create encrypted file
$ ansible-vault create vault.yml

# Edit encrypted vault
$ ansible-vault edit vault.yml

# Decrypt for viewing
$ ansible-vault view vault.yml

# In playbook
- name: Use vaulted secrets
  ios_config:
    lines:
      - "{{ vault_password }}"
    vault_password: "{{ vault_password }}"`,
    variablesTemplate: `# group_vars/all.yml
---
ansible_connection: network_cli
ansible_network_os: ios
gather_facts: false

# group_vars/switches.yml
---
domain_name: "example.com"
ntp_servers:
  - "10.1.1.1"
  - "10.1.1.2"

# host_vars/switch01.yml
---
hostname: "switch01"
ip_address: "10.1.1.100"

# In playbook
- name: Apply configuration
  ios_config:
    lines:
      - hostname {{ hostname }}
      - ip domain-name {{ domain_name }}`,
    collectionStructure: `my_collection/
├── galaxy.yml
├── plugins/
│   ├── modules/
│   │   └── my_module.py
│   ├── inventory/
│   └── lookup/
├── roles/
│   └── my_role/
├── playbooks/
│   └── my_playbook.yml
├── README.md
└── requirements.yml`,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Ansible Automation Helper</h1>
            <p className="text-red-100">Guide for Ansible Galaxy collections and device handling</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Galaxy Collections Tab */}
          {activeTab === 'collections' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">Ansible Galaxy Collections</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Collections are the distribution format for Ansible content. They contain modules, plugins, roles, and more.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">List Installed Collections</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono">
{`$ ansible-galaxy collection list
$ ansible-galaxy collection list -p ./collections
$ ansible-galaxy collection list --format json
$ ansible-doc -l cisco.ios`}
                    </pre>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Install Collections</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono">
{`$ ansible-galaxy collection install cisco.ios
$ ansible-galaxy collection install -r requirements.yml
$ ansible-galaxy collection install cisco.ios:==5.0.0`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Collection Documentation</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono">
{`# List all modules in a collection
$ ansible-doc -l cisco.ios

# Get documentation for a specific module
$ ansible-doc cisco.ios.ios_config

# Show module examples
$ ansible-doc cisco.ios.ios_config --examples`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Device Types Tab */}
          {activeTab === 'device-types' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Device Type Detection</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Different network devices require different Ansible configurations based on their capabilities.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {deviceTypeCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.type}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-medium text-gray-900">{card.type}</h3>
                      <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                      <div className="mt-3 bg-gray-100 rounded px-2 py-1">
                        <code className="text-xs text-gray-700">{card.settings}</code>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CLI Commands Tab */}
          {activeTab === 'cli-commands' && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-800">Direct SSH / CLI Commands</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      For devices without Python or Ansible Galaxy collection support, use direct SSH with cli_command or raw modules.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Playbook Template</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre">
{commandExamples.sshTemplate}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Key Modules</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li><code className="bg-gray-100 px-1 rounded">ansible.builtin.raw</code> - Execute low-level commands</li>
                    <li><code className="bg-gray-100 px-1 rounded">ansible.netcommon.cli_command</code> - CLI with better output handling</li>
                    <li><code className="bg-gray-100 px-1 rounded">ansible.netcommon.cli_config</code> - Configuration changes</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Connection Settings</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono">
{`ansible_connection: network_cli
ansible_network_os: ios
ansible_user: admin
ansible_password: "{{ vault_password }}"
gather_facts: false`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Devices Tab */}
          {activeTab === 'api-devices' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">API-only Devices</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      For devices that only support REST API access, use the uri module or collection-specific API modules.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">API Playbook Template</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre">
{commandExamples.apiTemplate}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Collection API Modules</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li><code className="bg-gray-100 px-1 rounded">cisco.dnac.*</code> - Cisco DNA Center</li>
                    <li><code className="bg-gray-100 px-1 rounded">aruba.aoscx.*</code> - Aruba AOS-CX</li>
                    <li><code className="bg-gray-100 px-1 rounded">junipernetworks.junos.*</code> - Juniper Junos</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Generic API Module</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono">
{`ansible.netcommon.uri:
  url: "https://device/api/v1/..."
  method: GET/POST/PUT/PATCH
  headers:
    Authorization: "Bearer {{ token }}"
    Content-Type: "application/json"
  body: {...}
  body_format: json`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-purple-800">Playbook Templates</h3>
                    <p className="text-sm text-purple-700 mt-1">
                      Copy and customize these templates for your specific use cases.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Standard Network Playbook</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(commandExamples.playbookTemplate)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono whitespace-pre">
{commandExamples.playbookTemplate}
                    </pre>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Device without Python</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(commandExamples.sshTemplate)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono whitespace-pre">
{commandExamples.sshTemplate}
                    </pre>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">API-based Device</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(commandExamples.apiTemplate)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono whitespace-pre">
{commandExamples.apiTemplate}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Concepts Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-indigo-800">Advanced Ansible Concepts</h3>
                    <p className="text-sm text-indigo-700 mt-1">
                      Learn about Ansible roles, collections, vault encryption, and variable management for production-ready automation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Roles Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FolderIcon className="h-5 w-5 text-orange-500" />
                  <h3 className="font-medium text-gray-900">Ansible Roles</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Roles provide a way to organize playbooks by breaking them into reusable components with tasks, handlers, variables, and templates.
                </p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre">
{advancedExamples.roleTemplate}
                  </pre>
                </div>
              </div>

              {/* Vault Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <LockClosedIcon className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-gray-900">Ansible Vault</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Ansible Vault encrypts sensitive data like passwords and keys within your playbooks or variable files.
                </p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre">
{advancedExamples.vaultTemplate}
                  </pre>
                </div>
              </div>

              {/* Variables Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <TableCellsIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium text-gray-900">Variables & Group_vars</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Variables allow you to parameterize your playbooks. Use group_vars for group-level and host_vars for host-specific variables.
                </p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre">
{advancedExamples.variablesTemplate}
                  </pre>
                </div>
              </div>

              {/* Collection Structure Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <KeyIcon className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium text-gray-900">Collection Structure</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Collections provide a standardized way to package and distribute Ansible content including modules, plugins, roles, and playbooks.
                </p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre">
{advancedExamples.collectionStructure}
                  </pre>
                </div>
              </div>

              {/* Best Practices */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3">Best Practices</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Use roles to organize complex playbooks into reusable components</li>
                  <li>• Always encrypt sensitive data with Ansible Vault</li>
                  <li>• Use group_vars and host_vars for variable management</li>
                  <li>• Create custom collections for organization-specific modules</li>
                  <li>• Use <code className="bg-green-100 px-1 rounded">ansible-vault view</code> to inspect encrypted files</li>
                  <li>• Reference variables with <code className="bg-green-100 px-1 rounded">{'{{ variable_name }}'}</code> syntax</li>
                  <li>• Use <code className="bg-green-100 px-1 rounded">--ask-vault-pass</code> or <code className="bg-green-100 px-1 rounded">--vault-password-file</code> for vault access</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Reference Footer */}
      <div className="bg-gray-800 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Quick Decision Flow</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-green-400 mb-2">✓ Has Python</h4>
            <p className="text-gray-300">Use <code className="bg-gray-600 px-1 rounded">gather_facts: true</code></p>
            <p className="text-gray-400 mt-1">Full Ansible support available</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">⚠ No Python</h4>
            <p className="text-gray-300">Use <code className="bg-gray-600 px-1 rounded">gather_facts: false</code></p>
            <p className="text-gray-400 mt-1">CLI modules only</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">◉ API Only</h4>
            <p className="text-gray-300">Use <code className="bg-gray-600 px-1 rounded">uri module</code></p>
            <p className="text-gray-400 mt-1">REST API automation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnsibleAutomationHelper;
