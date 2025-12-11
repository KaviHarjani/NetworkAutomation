import React, { useState, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { workflowAPI } from '../services/api';

// CommandEditor component moved outside to prevent recreation on each render
const CommandEditor = React.memo(({ stage, title, description, commands, onInputChange, onAddCommand, onRemoveCommand }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      
      <div className="space-y-4">
        {commands.map((cmd, index) => (
          <div key={cmd.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Command Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Command {index + 1} *
                </label>
                <input
                  type="text"
                  value={cmd.command}
                  onChange={(e) => onInputChange(stage, cmd.id, 'command', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Enter command for ${title.toLowerCase()}`}
                  autoComplete="off"
                />
              </div>
              
              {/* Regex Pattern Input with better styling */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Regex Pattern (Optional)
                  </label>
                  <div className="group relative">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">
                      ?
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                      Enter regex pattern to validate command output
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={cmd.regex_pattern}
                  onChange={(e) => onInputChange(stage, cmd.id, 'regex_pattern', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 transition-colors ${
                    cmd.regex_pattern.trim()
                      ? cmd.is_dynamic ? 'border-purple-300 focus:ring-purple-500 bg-purple-50' : 'border-green-300 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder={cmd.is_dynamic ? "Dynamic pattern with {{param}} (e.g., 'port {{port}}')" : "e.g., (success|completed|active)"}
                  autoComplete="off"
                />
                {/* Dynamic Pattern Toggle */}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onInputChange(stage, cmd.id, 'is_dynamic', !cmd.is_dynamic)}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 flex-shrink-0 ${
                      cmd.is_dynamic
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                    title={cmd.is_dynamic ? 'Disable dynamic pattern' : 'Enable dynamic pattern'}
                  >
                    {cmd.is_dynamic ? '🔄 Dynamic' : '🔄 Static'}
                  </button>
                  {/* Operator Selection */}
                  <select
                    value={cmd.operator || 'contains'}
                    onChange={(e) => onInputChange(stage, cmd.id, 'operator', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="contains">Contains</option>
                    <option value="equal">Is equal to</option>
                    <option value="not_equal">Is not equal to</option>
                    <option value="not_contains">Does not contain</option>
                  </select>
                </div>
                {/* Dynamic Pattern Help Text */}
                {cmd.is_dynamic && (
                  <div className="mt-1 text-xs text-purple-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Use {"{{param}}"} syntax. Example: {"port {{port}}"}
                  </div>
                )}
                {cmd.regex_pattern.trim() && (
                  <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Regex pattern will be applied to command output
                  </div>
                )}
              </div>
            </div>
            
            {/* Remove Button */}
            {commands.length > 1 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemoveCommand(stage, cmd.id)}
                  className="text-red-600 hover:text-red-800 p-1 flex items-center gap-1 text-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
        
        {/* Add Command Button */}
        <button
          type="button"
          onClick={() => onAddCommand(stage)}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Command with Regex Validation
        </button>
      </div>
      
      {/* Stage Statistics */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Commands: {commands.filter(cmd => cmd.command.trim()).length}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          With Regex: {commands.filter(cmd => cmd.regex_pattern.trim()).length}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          Regex Coverage: {commands.filter(cmd => cmd.command.trim()).length > 0
            ? Math.round((commands.filter(cmd => cmd.regex_pattern.trim()).length / commands.filter(cmd => cmd.command.trim()).length) * 100)
            : 0}%
        </span>
      </div>
    </div>
  );
});

const CreateWorkflow = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Stable state management with stable keys
  const [workflowData, setWorkflowData] = useState({
    name: '',
    description: '',
    status: 'active',
    pre_check_commands: [{ id: 'pre_1', command: '', regex_pattern: '', operator: 'contains', is_dynamic: false }],
    implementation_commands: [{ id: 'impl_1', command: '', regex_pattern: '', operator: 'contains', is_dynamic: false }],
    post_check_commands: [{ id: 'post_1', command: '', regex_pattern: '', operator: 'contains', is_dynamic: false }],
    rollback_commands: [{ id: 'roll_1', command: '', regex_pattern: '', operator: 'contains', is_dynamic: false }],
    validation_rules: {
      timeout: 30,
      retry_count: 3
    }
  });

  // Counter for generating unique IDs
  const [counters, setCounters] = useState({
    pre: 1,
    impl: 1,
    post: 1,
    roll: 1
  });

  // Stable input handler with useCallback
  const handleInputChange = useCallback((stage, id, field, value) => {
    setWorkflowData(prev => {
      const stageCommands = prev[stage];
      const updatedCommands = stageCommands.map(cmd => {
        if (cmd.id === id) {
          // Only update if value actually changed to prevent unnecessary re-renders
          if (cmd[field] !== value) {
            return { ...cmd, [field]: value };
          }
        }
        return cmd;
      });
      return {
        ...prev,
        [stage]: updatedCommands
      };
    });
  }, []);

  // Add command with unique ID - using useCallback
  const addCommand = useCallback((stage) => {
    const newId = `${stage.split('_')[0]}_${counters[stage.split('_')[0]] + 1}`;
    setCounters(prev => ({
      ...prev,
      [stage.split('_')[0]]: prev[stage.split('_')[0]] + 1
    }));
    
    setWorkflowData(prev => ({
      ...prev,
      [stage]: [...prev[stage], { id: newId, command: '', regex_pattern: '' }]
    }));
  }, [counters]);

  // Remove command - using useCallback
  const removeCommand = useCallback((stage, id) => {
    if (workflowData[stage].length > 1) {
      setWorkflowData(prev => ({
        ...prev,
        [stage]: prev[stage].filter(cmd => cmd.id !== id)
      }));
    }
  }, [workflowData]);

  // Get command count - using useMemo for performance
  const getCommandCount = useMemo(() => {
    const stages = ['pre_check_commands', 'implementation_commands', 'post_check_commands', 'rollback_commands'];
    return stages.reduce((total, stage) => {
      return total + workflowData[stage].filter(cmd => cmd.command.trim()).length;
    }, 0);
  }, [workflowData.pre_check_commands, workflowData.implementation_commands, workflowData.post_check_commands, workflowData.rollback_commands]);

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!workflowData.name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    
    if (getCommandCount === 0) {
      toast.error('Please add at least one command');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert to backend format
      const cleanedData = {
        name: workflowData.name,
        description: workflowData.description,
        status: workflowData.status,
        pre_check_commands: workflowData.pre_check_commands
          .filter(cmd => cmd.command.trim())
          .map(cmd => ({ command: cmd.command, regex_pattern: cmd.regex_pattern || '', operator: cmd.operator || 'contains', is_dynamic: cmd.is_dynamic || false })),
        implementation_commands: workflowData.implementation_commands
          .filter(cmd => cmd.command.trim())
          .map(cmd => ({ command: cmd.command, regex_pattern: cmd.regex_pattern || '', operator: cmd.operator || 'contains', is_dynamic: cmd.is_dynamic || false })),
        post_check_commands: workflowData.post_check_commands
          .filter(cmd => cmd.command.trim())
          .map(cmd => ({ command: cmd.command, regex_pattern: cmd.regex_pattern || '', operator: cmd.operator || 'contains', is_dynamic: cmd.is_dynamic || false })),
        rollback_commands: workflowData.rollback_commands
          .filter(cmd => cmd.command.trim())
          .map(cmd => ({ command: cmd.command, regex_pattern: cmd.regex_pattern || '', operator: cmd.operator || 'contains', is_dynamic: cmd.is_dynamic || false })),
        validation_rules: workflowData.validation_rules,
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
            Create a workflow template with command validation using regex patterns
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  value={workflowData.name}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter workflow name"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={workflowData.status}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={workflowData.description}
                onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter workflow description"
                autoComplete="off"
              />
            </div>

            {/* Validation Rules */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={workflowData.validation_rules.timeout}
                  onChange={(e) => setWorkflowData(prev => ({
                    ...prev,
                    validation_rules: {
                      ...prev.validation_rules,
                      timeout: parseInt(e.target.value) || 30
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retry Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={workflowData.validation_rules.retry_count}
                  onChange={(e) => setWorkflowData(prev => ({
                    ...prev,
                    validation_rules: {
                      ...prev.validation_rules,
                      retry_count: parseInt(e.target.value) || 3
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="3"
                />
              </div>
            </div>
          </div>

          {/* Command Stages with Regex Validation */}
          <div className="space-y-8">
            <h2 className="text-xl font-semibold text-gray-900">Command Stages with Regex Validation</h2>
            
            <CommandEditor
              stage="pre_check_commands"
              title="Pre-Check Commands"
              description="Commands to verify the current state before making changes"
              commands={workflowData.pre_check_commands}
              onInputChange={handleInputChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
            
            <CommandEditor
              stage="implementation_commands"
              title="Implementation Commands"
              description="Commands that make the actual changes to the system"
              commands={workflowData.implementation_commands}
              onInputChange={handleInputChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
            
            <CommandEditor
              stage="post_check_commands"
              title="Post-Check Commands"
              description="Commands to verify the changes were applied correctly"
              commands={workflowData.post_check_commands}
              onInputChange={handleInputChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
            
            <CommandEditor
              stage="rollback_commands"
              title="Rollback Commands"
              description="Commands to revert changes if something goes wrong"
              commands={workflowData.rollback_commands}
              onInputChange={handleInputChange}
              onAddCommand={addCommand}
              onRemoveCommand={removeCommand}
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Workflow Summary</h3>
            
            {/* Command Count by Stage */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {workflowData.pre_check_commands.filter(cmd => cmd.command.trim()).length}
                </div>
                <div className="text-blue-700">Pre-Check</div>
                <div className="text-xs text-blue-600 mt-1">
                  {workflowData.pre_check_commands.filter(cmd => cmd.regex_pattern.trim()).length} with regex
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {workflowData.implementation_commands.filter(cmd => cmd.command.trim()).length}
                </div>
                <div className="text-blue-700">Implementation</div>
                <div className="text-xs text-blue-600 mt-1">
                  {workflowData.implementation_commands.filter(cmd => cmd.regex_pattern.trim()).length} with regex
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {workflowData.post_check_commands.filter(cmd => cmd.command.trim()).length}
                </div>
                <div className="text-blue-700">Post-Check</div>
                <div className="text-xs text-blue-600 mt-1">
                  {workflowData.post_check_commands.filter(cmd => cmd.regex_pattern.trim()).length} with regex
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {workflowData.rollback_commands.filter(cmd => cmd.command.trim()).length}
                </div>
                <div className="text-blue-700">Rollback</div>
                <div className="text-xs text-blue-600 mt-1">
                  {workflowData.rollback_commands.filter(cmd => cmd.regex_pattern.trim()).length} with regex
                </div>
              </div>
            </div>
            
            {/* Overall Statistics */}
            <div className="border-t border-blue-200 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {getCommandCount}
                  </div>
                  <div className="text-sm text-blue-700">Total Commands</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {[
                      ...workflowData.pre_check_commands,
                      ...workflowData.implementation_commands,
                      ...workflowData.post_check_commands,
                      ...workflowData.rollback_commands
                    ].filter(cmd => cmd.regex_pattern.trim()).length}
                  </div>
                  <div className="text-sm text-green-700">With Regex Validation</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">
                    {getCommandCount > 0
                      ? Math.round(([
                          ...workflowData.pre_check_commands,
                          ...workflowData.implementation_commands,
                          ...workflowData.post_check_commands,
                          ...workflowData.rollback_commands
                        ].filter(cmd => cmd.regex_pattern.trim()).length / getCommandCount) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-yellow-700">Regex Coverage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.location.href = '/workflows'}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || getCommandCount === 0 || !workflowData.name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Workflow Template'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkflow;