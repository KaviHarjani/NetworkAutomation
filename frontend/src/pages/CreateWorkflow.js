import React, { useState, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
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
                <input
                  type="text"
                  placeholder={`Enter command for ${title.toLowerCase()}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={command.command || ''}
                  onChange={(e) => onCommandChange(stage, index, e.target.value, 'command')}
                  autoComplete="off"
                />
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
    pre_check_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false }],
    implementation_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false }],
    post_check_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false }],
    rollback_commands: [{ command: '', regex_pattern: '', expected_output: '', operator: 'contains', is_dynamic: false }],
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
      [stage]: [...prev[stage], { command: '', regex_pattern: '', expected_output: '' }]
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
          is_dynamic: cmd.is_dynamic || false
        })),
        implementation_commands: formData.implementation_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false
        })),
        post_check_commands: formData.post_check_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false
        })),
        rollback_commands: formData.rollback_commands.filter(cmd => cmd.command && cmd.command.trim()).map(cmd => ({
          command: cmd.command,
          regex_pattern: cmd.regex_pattern || '',
          operator: cmd.operator || 'contains',
          is_dynamic: cmd.is_dynamic || false
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
            <div className="text-center">
              <span className="text-lg font-semibold text-blue-900">
                Total Commands: {commandCount}
              </span>
            </div>
          </div>

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