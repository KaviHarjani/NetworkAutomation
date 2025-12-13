import React, { useState, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, EyeIcon, CodeBracketIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { workflowAPI } from '../services/api';

// Helper function to highlight regex matches
const highlightRegexMatches = (text, pattern) => {
  if (!pattern || !text) return text;
  
  try {
    // Create regex from pattern - case insensitive by default
    const regex = new RegExp(pattern, 'gi');
    const matches = [];
    let match;
    
    // Find all matches
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
    
    if (matches.length === 0) return text;
    
    // Build highlighted JSX
    const parts = [];
    let lastIndex = 0;
    
    matches.forEach((match, index) => {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, match.start)}
          </span>
        );
      }
      
      // Add highlighted match
      parts.push(
        <span
          key={`match-${index}`}
          className="bg-yellow-200 text-yellow-900 px-1 rounded font-medium"
        >
          {match.text}
        </span>
      );
      
      lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }
    
    return parts;
  } catch (error) {
    // If regex is invalid, return original text
    return text;
  }
};

// Helper function to highlight variable references in commands
const highlightVariableReferences = (text) => {
  if (!text) return text;
  
  try {
    // Match {variable_name} patterns
    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [];
    let match;
    
    // Find all variable references
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        variableName: match[1]
      });
    }
    
    if (matches.length === 0) return text;
    
    // Build highlighted JSX
    const parts = [];
    let lastIndex = 0;
    
    matches.forEach((match, index) => {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, match.start)}
          </span>
        );
      }
      
      // Add highlighted variable reference
      parts.push(
        <span
          key={`var-${index}`}
          className="bg-blue-200 text-blue-900 px-1 rounded font-mono text-sm"
          title={`Variable: ${match.variableName}`}
        >
          {match.text}
        </span>
      );
      
      lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }
    
    return parts;
  } catch (error) {
    // If regex is invalid, return original text
    return text;
  }
};

// CommandEditor component moved outside to prevent recreation on each render
const CommandEditor = React.memo(({ stage, title, description, commands, onCommandChange, onAddCommand, onRemoveCommand }) => {
  const [showPreview, setShowPreview] = useState({});

  const togglePreview = (index) => {
    setShowPreview(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      
      <div className="space-y-4">
        {commands.map((command, index) => {
          // CRITICAL FIX: Use a truly stable key that doesn't change during typing
          // Only use stage and index - never include command content in the key
          const commandId = `${stage}-${index}`;
          return (
            <div key={commandId} className="border border-gray-200 rounded-lg p-4 space-y-3">
              {/* Command Input */}
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 w-8 flex-shrink-0">{index + 1}.</span>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={`Enter command for ${title.toLowerCase()} (use {variable_name} to reference variables)`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={command.command || ''}
                    onChange={(e) => onCommandChange(stage, index, e.target.value, 'command')}
                    autoComplete="off"
                  />
                  
                  {/* Variable Reference Helper */}
                  {command.command && command.command.includes('{') && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <div className="text-blue-800 font-medium mb-1">Variable References Detected:</div>
                      <div className="font-mono text-xs">
                        {highlightVariableReferences(command.command)}
                      </div>
                      <div className="text-blue-600 text-xs mt-1">
                        💡 Variables will be replaced with values from previous commands
                      </div>
                    </div>
                  )}
                </div>
                {commands.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveCommand(stage, index)}
                    className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Regex Pattern Input with Dynamic Toggle */}
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 w-8 flex-shrink-0"></span>
                <input
                  type="text"
                  placeholder={command.is_dynamic ? "Dynamic pattern with {{param}} (e.g., 'interface {{interface}}')" : "Regex pattern to match output (e.g., 'interface (\\w+)' )"}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 transition-colors ${
                    command.is_dynamic ? 'border-purple-300 focus:ring-purple-500 bg-purple-50' : 'border-gray-300 focus:ring-green-500'
                  }`}
                  value={command.regex_pattern || ''}
                  onChange={(e) => onCommandChange(stage, index, e.target.value, 'regex_pattern')}
                  autoComplete="off"
                />
                {/* Dynamic Pattern Toggle */}
                <button
                  type="button"
                  onClick={() => onCommandChange(stage, index, !command.is_dynamic, 'is_dynamic')}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 flex-shrink-0 ${
                    command.is_dynamic
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                  title={command.is_dynamic ? 'Disable dynamic pattern' : 'Enable dynamic pattern'}
                >
                  {command.is_dynamic ? '🔄 Dynamic' : '🔄 Static'}
                </button>
                {/* Operator Selection */}
                <select
                  value={command.operator || 'contains'}
                  onChange={(e) => onCommandChange(stage, index, e.target.value, 'operator')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="contains">Contains</option>
                  <option value="equal">Is equal to</option>
                  <option value="not_equal">Is not equal to</option>
                  <option value="not_contains">Does not contain</option>
                </select>
              </div>
              {/* Dynamic Pattern Help Text */}
              {command.is_dynamic && (
                <div className="ml-8 mt-1 text-xs text-purple-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Use {"{{param}}"} syntax. Example: {"port {{port}}"}
                </div>
              )}
              <div className="ml-8">
                <button
                  type="button"
                  onClick={() => togglePreview(index)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 flex-shrink-0 ${
                    showPreview[index]
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <EyeIcon className="w-4 h-4" />
                  Preview
                </button>
              </div>

              {/* Expected Output Preview */}
              {showPreview[index] && (
                <div className="ml-8 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Command Output:
                  </label>
                  <textarea
                    placeholder="Paste expected output from this command here to test your regex pattern..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    rows={4}
                    value={command.expected_output || ''}
                    onChange={(e) => onCommandChange(stage, index, e.target.value, 'expected_output')}
                  />
                  
                  {command.expected_output && command.regex_pattern && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Regex Match Preview:
                      </label>
                      <div className="bg-gray-50 border border-gray-300 rounded-md p-3 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {highlightRegexMatches(command.expected_output, command.regex_pattern)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Yellow highlights show what your regex pattern will match
                      </div>
                    </div>
                  )}
                  
                  {command.expected_output && !command.regex_pattern && (
                    <div className="text-xs text-amber-600">
                      Enter a regex pattern above to see matches highlighted
                    </div>
                  )}
                </div>
              )}

              {/* Variable Assignment Section */}
              <div className="ml-8 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`store-variable-${commandId}`}
                    checked={command.store_in_variable ? true : false}
                    onChange={(e) => onCommandChange(stage, index, e.target.checked ? 'variable_name_placeholder' : '', 'store_in_variable')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`store-variable-${commandId}`} className="text-sm font-medium text-gray-700">
                    Store output in variable
                  </label>
                </div>
                
                {command.store_in_variable && (
                  <div className="space-y-2 pl-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Variable Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., interface_name, vlan_id, router_id"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={command.store_in_variable === 'variable_name_placeholder' ? '' : command.store_in_variable}
                        onChange={(e) => onCommandChange(stage, index, e.target.value, 'store_in_variable')}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Use this variable in other commands with {"{variable_name}"} syntax
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Variable Description (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Brief description of what this variable represents"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={command.variable_description || ''}
                        onChange={(e) => onCommandChange(stage, index, e.target.value, 'variable_description')}
                      />
                    </div>
                    
                    {command.regex_pattern && (
                      <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
                        💡 The matched text from your regex pattern will be stored in this variable
                      </div>
                    )}
                    
                    {!command.regex_pattern && (
                      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                        ⚠️ Consider adding a regex pattern to extract specific data for the variable
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        <button
          type="button"
          onClick={() => onAddCommand(stage)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm ml-8"
        >
          <PlusIcon className="w-4 h-4" />
          Add Command
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Commands: {commands.filter(cmd => cmd.command && cmd.command.trim()).length}
      </div>
    </div>
  );
});

const CreateWorkflow = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Very simple state management - just the basics
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    pre_check_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false, store_in_variable: '', variable_description: '' }],
    implementation_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false, store_in_variable: '', variable_description: '' }],
    post_check_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false, store_in_variable: '', variable_description: '' }],
    rollback_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false, store_in_variable: '', variable_description: '' }],
    validation_rules: {
      timeout: 30,
      retry_count: 3
    }
  });

  // Simple input handler with useCallback
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Simple command handler with useCallback
  const handleCommandChange = useCallback((stage, index, value, field) => {
    setFormData(prev => {
      const commands = [...prev[stage]];
      commands[index] = {
        ...commands[index],
        [field]: value
      };
      return {
        ...prev,
        [stage]: commands
      };
    });
  }, []);

  // Add command with useCallback
  const addCommand = useCallback((stage) => {
    setFormData(prev => ({
      ...prev,
      [stage]: [...prev[stage], { command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false, store_in_variable: '', variable_description: '' }]
    }));
  }, []);

  // Remove command with useCallback
  const removeCommand = useCallback((stage, index) => {
    if (formData[stage].length > 1) {
      setFormData(prev => ({
        ...prev,
        [stage]: prev[stage].filter((_, i) => i !== index)
      }));
    }
  }, [formData]);

  // Get command count using useMemo for performance
  const commandCount = useMemo(() => {
    const stages = ['pre_check_commands', 'implementation_commands', 'post_check_commands', 'rollback_commands'];
    return stages.reduce((total, stage) => {
      return total + formData[stage].filter(cmd => cmd.command && cmd.command.trim()).length;
    }, 0);
  }, [formData]);

  // Extract dynamic parameters from commands
  const dynamicParams = useMemo(() => {
    const stages = ['pre_check_commands', 'implementation_commands', 'post_check_commands', 'rollback_commands'];
    const params = [];
    
    stages.forEach(stage => {
      formData[stage].forEach(cmd => {
        if (cmd.is_dynamic && cmd.command && cmd.command.trim()) {
          // Extract {{param}} patterns from the command
          const matches = cmd.command.match(/\{\{([^}]+)\}\}/g);
          if (matches) {
            matches.forEach(match => {
              const paramName = match.replace(/\{\{|\}\}/g, '').trim();
              if (!params.find(p => p.name === paramName)) {
                params.push({
                  name: paramName,
                  command: cmd.command,
                  stage: stage.replace('_commands', '').replace('_', ' ')
                });
              }
            });
          }
        }
      });
    });
    
    return params;
  }, [formData]);

  // Generate example API body
  const exampleApiBody = useMemo(() => {
    const dynamicParamsObj = {};
    dynamicParams.forEach(param => {
      // Generate smart example values based on parameter name
      let exampleValue = 'value';
      const paramLower = param.name.toLowerCase();
      
      if (paramLower.includes('interface') || paramLower.includes('port')) {
        exampleValue = 'GigabitEthernet0/1';
      } else if (paramLower.includes('vlan')) {
        exampleValue = '100';
      } else if (paramLower.includes('ip') || paramLower.includes('address')) {
        exampleValue = '192.168.1.1';
      } else if (paramLower.includes('mask') || paramLower.includes('subnet')) {
        exampleValue = '255.255.255.0';
      } else if (paramLower.includes('name') || paramLower.includes('hostname')) {
        exampleValue = 'example-name';
      } else if (paramLower.includes('description') || paramLower.includes('desc')) {
        exampleValue = 'Example description';
      } else if (paramLower.includes('speed')) {
        exampleValue = '1000';
      } else if (paramLower.includes('duplex')) {
        exampleValue = 'full';
      } else if (paramLower.includes('mtu')) {
        exampleValue = '1500';
      } else if (paramLower.includes('cost')) {
        exampleValue = '10';
      } else if (paramLower.includes('priority')) {
        exampleValue = '100';
      } else if (paramLower.includes('timeout')) {
        exampleValue = '30';
      } else if (paramLower.includes('count') || paramLower.includes('number')) {
        exampleValue = '5';
      }
      
      dynamicParamsObj[param.command] = exampleValue;
    });
    
    return {
      workflow_id: 'WORKFLOW_ID_HERE',
      device_id: 'DEVICE_ID_HERE',
      dynamic_params: dynamicParamsObj
    };
  }, [dynamicParams]);

  // State for showing API example
  const [showApiExample, setShowApiExample] = useState(false);

  // Copy to clipboard function
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, []);

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    
    if (commandCount === 0) {
      toast.error('Please add at least one command');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert to the expected format
      const cleanedData = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        pre_check_commands: formData.pre_check_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false,
          store_in_variable: cmd.store_in_variable || '',
          variable_description: cmd.variable_description || ''
        })),
        implementation_commands: formData.implementation_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false,
          store_in_variable: cmd.store_in_variable || '',
          variable_description: cmd.variable_description || ''
        })),
        post_check_commands: formData.post_check_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false,
          store_in_variable: cmd.store_in_variable || '',
          variable_description: cmd.variable_description || ''
        })),
        rollback_commands: formData.rollback_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false,
          store_in_variable: cmd.store_in_variable || '',
          variable_description: cmd.variable_description || ''
        })),
        validation_rules: formData.validation_rules,
      };

      await workflowAPI.createWorkflow(cleanedData);
      toast.success('Workflow created successfully!');
      window.location.href = '/workflows';
    } catch (error) {
      toast.error('Failed to create workflow: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Workflow Template</h1>
          <p className="mt-2 text-gray-600">
            Create a workflow template with commands and regex patterns for output validation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
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
                  placeholder="Enter workflow description"
                />
              </div>
            </div>
          </div>

          {/* Command Stages */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Command Stages</h2>
            
            <CommandEditor
              stage="pre_check_commands"
              title="Pre-Check Commands"
              description="Commands to verify the current state"
              commands={formData.pre_check_commands}
              onCommandChange={handleCommandChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
            
            <CommandEditor
              stage="implementation_commands"
              title="Implementation Commands"
              description="Commands that make the actual changes"
              commands={formData.implementation_commands}
              onCommandChange={handleCommandChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
            
            <CommandEditor
              stage="post_check_commands"
              title="Post-Check Commands"
              description="Commands to verify the changes"
              commands={formData.post_check_commands}
              onCommandChange={handleCommandChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
            
            <CommandEditor
              stage="rollback_commands"
              title="Rollback Commands"
              description="Commands to revert changes"
              commands={formData.rollback_commands}
              onCommandChange={handleCommandChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Summary</h3>
            <div className="flex justify-center items-center gap-8">
              <span className="text-lg font-semibold text-blue-900">
                Total Commands: {commandCount}
              </span>
              <span className="text-lg font-semibold text-purple-900">
                Dynamic Parameters: {dynamicParams.length}
              </span>
            </div>
          </div>

          {/* API Example Preview - Only show if there are dynamic parameters */}
          {dynamicParams.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CodeBracketIcon className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-900">API Example Preview</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiExample(!showApiExample)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    showApiExample
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'
                  }`}
                >
                  {showApiExample ? 'Hide Example' : 'Show Example'}
                </button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-yellow-800 mb-2">⚠️ Dynamic Parameters Detected</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  This workflow requires the following dynamic parameters when triggered via API:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {dynamicParams.map((param, index) => (
                    <li key={index}>
                      <span className="font-mono bg-yellow-100 px-1 rounded">{`{{${param.name}}}`}</span>
                      <span className="text-yellow-600 ml-2">in {param.stage}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {showApiExample && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Example API Request Body</h4>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(exampleApiBody, null, 2))}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                    <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{JSON.stringify(exampleApiBody, null, 2)}</pre>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Replace WORKFLOW_ID_HERE and DEVICE_ID_HERE with actual IDs after creating the workflow
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">API Endpoint</h4>
                    <div className="bg-blue-100 text-blue-800 rounded p-3 font-mono text-sm">
                      POST /api/workflows/execute/
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Send the request to this endpoint with the JSON body shown above
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">How Dynamic Parameters Work</h4>
                    <ol className="list-decimal list-inside text-sm text-green-700 space-y-1">
                      <li>Commands marked as "Dynamic" use <span className="font-mono bg-green-100 px-1 rounded">{`{{param}}`}</span> syntax</li>
                      <li>When executing via API, provide values in the <span className="font-mono bg-green-100 px-1 rounded">dynamic_params</span> object</li>
                      <li>The system replaces placeholders with provided values before execution</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.location.href = '/workflows'}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || commandCount === 0 || !formData.name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Workflow Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkflow;