import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import { workflowAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const WorkflowEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch existing workflow
  const { data: workflowData, isLoading: workflowLoading, error: workflowError } = useQuery(
    ['workflow', id],
    () => workflowAPI.getWorkflow(id),
    {
      refetchOnWindowFocus: false,
    }
  );

  const workflow = workflowData?.data;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      status: 'draft',
    },
  });

  // Populate form when workflow data is loaded
  useEffect(() => {
    if (workflow) {
      setValue('name', workflow.name || '');
      setValue('description', workflow.description || '');
      setValue('status', workflow.status || 'draft');
    }
  }, [workflow, setValue]);

  // Initialize command sections
  const [commandSections, setCommandSections] = useState({
    pre_check: [],
    implementation: [],
    post_check: [],
    rollback: [],
  });

  // Populate command sections when workflow data is loaded
  useEffect(() => {
    if (workflow) {
      setCommandSections({
        pre_check: workflow.pre_check_commands || [],
        implementation: workflow.implementation_commands || [],
        post_check: workflow.post_check_commands || [],
        rollback: workflow.rollback_commands || [],
      });
    }
  }, [workflow]);

  // Add command to section
  const addCommand = (section) => {
    setCommandSections(prev => ({
      ...prev,
      [section]: [...prev[section], {
        command: '',
        description: '',
        regex_pattern: '',
        operator: 'contains',
        expected_exit_code: null,
        condition: null // For conditional logic
      }],
    }));
  };

  // Remove command from section
  const removeCommand = (section, index) => {
    setCommandSections(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  // Update command
  const updateCommand = (section, index, field, value) => {
    setCommandSections(prev => ({
      ...prev,
      [section]: prev[section].map((cmd, i) => 
        i === index ? { ...cmd, [field]: value } : cmd
      ),
    }));
  };

  // Update workflow mutation
  const updateMutation = useMutation(
    (data) => workflowAPI.updateWorkflow(id, data),
    {
      onSuccess: () => {
        toast.success('Workflow updated successfully!');
        queryClient.invalidateQueries(['workflows']);
        queryClient.invalidateQueries(['workflow', id]);
        navigate('/workflows');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update workflow');
      },
    }
  );

  const onSubmit = async (formData) => {
    // Prepare data for submission
    const submitData = {
      ...formData,
      pre_check_commands: commandSections.pre_check,
      implementation_commands: commandSections.implementation,
      post_check_commands: commandSections.post_check,
      rollback_commands: commandSections.rollback,
    };

    updateMutation.mutate(submitData);
  };

  // Loading state
  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Error state
  if (workflowError || !workflow) {
    toast.error('Failed to load workflow');
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow not found</h3>
        <p className="text-gray-500 mb-4">The workflow you're trying to edit doesn't exist.</p>
        <Link
          to="/workflows"
          className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg inline-flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Workflows
        </Link>
      </div>
    );
  }

  const renderCommandSection = (title, sectionKey, bgColor) => {
    const commands = commandSections[sectionKey] || [];

    return (
      <div className={`${bgColor} rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={() => addCommand(sectionKey)}
            className="bg-white text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm border"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Command
          </button>
        </div>

        {!Array.isArray(commands) || commands.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No commands added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commands.map((command, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">Command {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeCommand(sectionKey, index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Command *
                    </label>
                    <textarea
                      value={command?.command || ''}
                      onChange={(e) => updateCommand(sectionKey, index, 'command', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                      rows={2}
                      placeholder="Enter command..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={command?.description || ''}
                      onChange={(e) => updateCommand(sectionKey, index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      placeholder="Command description..."
                    />
                  </div>
                  
                  {/* Validation/Regex Pattern Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Output Validation (Optional)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Regex Pattern
                        </label>
                        <input
                          type="text"
                          value={command?.regex_pattern || ''}
                          onChange={(e) => updateCommand(sectionKey, index, 'regex_pattern', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                          placeholder="Enter regex pattern to validate output..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Used to validate command output and extract variables
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Match Operator
                        </label>
                        <select
                          value={command?.operator || 'contains'}
                          onChange={(e) => updateCommand(sectionKey, index, 'operator', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        >
                          <option value="contains">Contains</option>
                          <option value="matches">Regex Matches</option>
                          <option value="equals">Equals</option>
                          <option value="starts_with">Starts With</option>
                          <option value="ends_with">Ends With</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Expected Exit Code (Optional)
                      </label>
                      <input
                        type="number"
                        value={command?.expected_exit_code || ''}
                        onChange={(e) => updateCommand(sectionKey, index, 'expected_exit_code', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        placeholder="Leave empty for any exit code"
                        min="0"
                        max="255"
                      />
                    </div>
                  </div>

                  {/* Conditional Logic Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Conditional Logic (Optional)</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Define conditions to execute different commands based on this command's result
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Condition Type
                        </label>
                        <select
                          value={command?.condition?.type || ''}
                          onChange={(e) => {
                            const conditionType = e.target.value;
                            updateCommand(sectionKey, index, 'condition', conditionType ? {
                              type: conditionType,
                              pattern: '',
                              operator: 'contains',
                              then: [],
                              else: []
                            } : null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        >
                          <option value="">No condition</option>
                          <option value="if_regex_matches">If regex matches</option>
                          <option value="if_exit_code_equals">If exit code equals</option>
                          <option value="if_output_contains">If output contains</option>
                          <option value="if_variable_equals">If variable equals</option>
                        </select>
                      </div>

                      {command?.condition && (
                        <>
                          {/* Condition Parameters */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {command.condition.type === 'if_regex_matches' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Pattern to Match
                                </label>
                                <input
                                  type="text"
                                  value={command.condition.pattern || ''}
                                  onChange={(e) => updateCommand(sectionKey, index, 'condition', {
                                    ...command.condition,
                                    pattern: e.target.value
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                                  placeholder="Enter pattern..."
                                />
                              </div>
                            )}

                            {command.condition.type === 'if_exit_code_equals' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Expected Exit Code
                                </label>
                                <input
                                  type="number"
                                  value={command.condition.exit_code || ''}
                                  onChange={(e) => updateCommand(sectionKey, index, 'condition', {
                                    ...command.condition,
                                    exit_code: parseInt(e.target.value) || 0
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                  min="0"
                                  max="255"
                                />
                              </div>
                            )}

                            {command.condition.type === 'if_output_contains' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Text to Contain
                                </label>
                                <input
                                  type="text"
                                  value={command.condition.text || ''}
                                  onChange={(e) => updateCommand(sectionKey, index, 'condition', {
                                    ...command.condition,
                                    text: e.target.value
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                  placeholder="Enter text..."
                                />
                              </div>
                            )}

                            {command.condition.type === 'if_variable_equals' && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Variable Name
                                  </label>
                                  <input
                                    type="text"
                                    value={command.condition.variable_name || ''}
                                    onChange={(e) => updateCommand(sectionKey, index, 'condition', {
                                      ...command.condition,
                                      variable_name: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                    placeholder="Variable name..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Expected Value
                                  </label>
                                  <input
                                    type="text"
                                    value={command.condition.value || ''}
                                    onChange={(e) => updateCommand(sectionKey, index, 'condition', {
                                      ...command.condition,
                                      value: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                    placeholder="Expected value..."
                                  />
                                </div>
                              </>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Match Operator
                              </label>
                              <select
                                value={command.condition.operator || 'contains'}
                                onChange={(e) => updateCommand(sectionKey, index, 'condition', {
                                  ...command.condition,
                                  operator: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                              >
                                <option value="contains">Contains</option>
                                <option value="matches">Regex Matches</option>
                                <option value="equals">Equals</option>
                                <option value="starts_with">Starts With</option>
                                <option value="ends_with">Ends With</option>
                              </select>
                            </div>
                          </div>

                          {/* Then Commands */}
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-green-800 mb-2">Then (Execute if condition is true)</h5>
                            <textarea
                              value={JSON.stringify(command.condition.then || [], null, 2)}
                              onChange={(e) => {
                                try {
                                  const thenCommands = JSON.parse(e.target.value);
                                  updateCommand(sectionKey, index, 'condition', {
                                    ...command.condition,
                                    then: Array.isArray(thenCommands) ? thenCommands : []
                                  });
                                } catch (err) {
                                  // Invalid JSON, ignore
                                }
                              }}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                              rows={3}
                              placeholder='[{"command": "show version", "description": "Execute on success"}]'
                            />
                            <p className="text-xs text-green-600 mt-1">
                              Enter JSON array of commands to execute if condition is met
                            </p>
                          </div>

                          {/* Else Commands */}
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-red-800 mb-2">Else (Execute if condition is false)</h5>
                            <textarea
                              value={JSON.stringify(command.condition.else || [], null, 2)}
                              onChange={(e) => {
                                try {
                                  const elseCommands = JSON.parse(e.target.value);
                                  updateCommand(sectionKey, index, 'condition', {
                                    ...command.condition,
                                    else: Array.isArray(elseCommands) ? elseCommands : []
                                  });
                                } catch (err) {
                                  // Invalid JSON, ignore
                                }
                              }}
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                              rows={3}
                              placeholder='[{"command": "show logging", "description": "Execute on failure"}]'
                            />
                            <p className="text-xs text-red-600 mt-1">
                              Enter JSON array of commands to execute if condition is not met
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to={`/workflows/${id}`}
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Workflow</h1>
            <div className="flex items-center mt-2">
              <StatusBadge status={workflow.status} type="workflow" />
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Workflow name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter workflow name..."
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter workflow description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                {...register('status', { required: 'Status is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
              {errors.status && (
                <p className="text-red-600 text-sm mt-1">{errors.status.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Command Sections */}
        <div className="space-y-6">
          {renderCommandSection('Pre-check Commands', 'pre_check', 'bg-blue-50')}
          {renderCommandSection('Implementation Commands', 'implementation', 'bg-green-50')}
          {renderCommandSection('Post-check Commands', 'post_check', 'bg-purple-50')}
          {renderCommandSection('Rollback Commands', 'rollback', 'bg-orange-50')}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Link
            to={`/workflows/${id}`}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors duration-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkflowEdit;