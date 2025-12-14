import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EyeIcon, CodeBracketIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import BPMNWorkflow from '../components/BPMNWorkflow';
import CommandNode from '../components/nodes/CommandNode';
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

// Enhanced CommandEditor with if/else support
const EnhancedCommandEditor = ({
  stage,
  title,
  description,
  commands,
  onCommandChange,
  onAddCommand,
  onRemoveCommand,
  onAddCondition
}) => {
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
              
              <div className="ml-8 flex gap-2">
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
                
                {/* Add If/Else Button */}
                <button
                  type="button"
                  onClick={() => onAddCondition(stage, index)}
                  className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 flex-shrink-0 bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200"
                >
                  <span className="text-yellow-600">⚡</span>
                  Add If/Else
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

              {/* Conditional Logic Section */}
              <div className="ml-8 mt-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Conditional Logic (Optional)</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="text-xs text-blue-800 font-medium mb-1">💡 How to use conditions for workflow progression:</div>
                  <div className="text-xs text-blue-700">
                    • <strong>Pre-check stage:</strong> Success → proceed to implementation, Failed → abort workflow<br/>
                    • <strong>Post-check stage:</strong> Success → mark as completed, Failed → trigger rollback<br/>
                    • <strong>Implementation stage:</strong> Success → continue, Failed → execute error handling
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Define conditions to execute different commands based on this command's result
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Condition Type
                    </label>
                    <select
                      value={command.condition?.type || ''}
                      onChange={(e) => {
                        const conditionType = e.target.value;
                        console.log('Condition type selected:', conditionType);
                        
                        let condition = null;
                        if (conditionType) {
                          // Create a new condition object based on type
                          const baseCondition = {
                            type: conditionType,
                            operator: 'contains',
                            then: [],
                            else: []
                          };
                          
                          // Add type-specific properties
                          switch (conditionType) {
                            case 'if_regex_matches':
                              condition = { ...baseCondition, pattern: '' };
                              break;
                            case 'if_exit_code_equals':
                              condition = { ...baseCondition, exit_code: 0 };
                              break;
                            case 'if_output_contains':
                              condition = { ...baseCondition, text: '' };
                              break;
                            case 'if_variable_equals':
                              condition = { ...baseCondition, variable_name: '', value: '' };
                              break;
                            case 'loop_until_condition':
                              condition = {
                                ...baseCondition,
                                max_iterations: 10,
                                timeout_seconds: 600,
                                check_condition: {
                                  type: 'if_output_contains',
                                  text: '',
                                  operator: 'contains'
                                },
                                loop_commands: []
                              };
                              break;
                            default:
                              condition = baseCondition;
                              break;
                          }
                        }
                        
                        console.log('Updating condition:', condition);
                        onCommandChange(stage, index, condition, 'condition');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    >
                      <option value="">🚫 No condition</option>
                      <option value="if_regex_matches">🔍 If regex matches</option>
                      <option value="if_exit_code_equals">🔢 If exit code equals</option>
                      <option value="if_output_contains">📝 If output contains</option>
                      <option value="if_variable_equals">🏷️ If variable equals</option>
                      <option value="loop_until_condition">🔄 Loop until condition (with timeout)</option>
                    </select>
                  </div>

                  {command.condition && command.condition.type && (
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
                              onChange={(e) => onCommandChange(stage, index, {
                                ...command.condition,
                                pattern: e.target.value
                              }, 'condition')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                              placeholder="e.g., 'interface (\\w+)' to match interface names"
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
                              onChange={(e) => onCommandChange(stage, index, {
                                ...command.condition,
                                exit_code: parseInt(e.target.value) || 0
                              }, 'condition')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                              onChange={(e) => onCommandChange(stage, index, {
                                ...command.condition,
                                text: e.target.value
                              }, 'condition')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                                onChange={(e) => onCommandChange(stage, index, {
                                  ...command.condition,
                                  variable_name: e.target.value
                                }, 'condition')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                                onChange={(e) => onCommandChange(stage, index, {
                                  ...command.condition,
                                  value: e.target.value
                                }, 'condition')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Expected value..."
                              />
                            </div>
                          </>
                        )}

                        {command.condition.type === 'loop_until_condition' && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Max Iterations
                                </label>
                                <input
                                  type="number"
                                  value={command.condition.max_iterations || 10}
                                  onChange={(e) => onCommandChange(stage, index, {
                                    ...command.condition,
                                    max_iterations: parseInt(e.target.value) || 10
                                  }, 'condition')}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="1"
                                  max="100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Timeout (seconds)
                                </label>
                                <input
                                  type="number"
                                  value={command.condition.timeout_seconds || 600}
                                  onChange={(e) => onCommandChange(stage, index, {
                                    ...command.condition,
                                    timeout_seconds: parseInt(e.target.value) || 600
                                  }, 'condition')}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="1"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  {Math.floor((command.condition.timeout_seconds || 600) / 60)} minutes
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="block text-xs font-medium text-gray-600 mb-2">
                                Exit Condition (when to stop looping)
                              </label>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Check Type
                                  </label>
                                  <select
                                    value={command.condition.check_condition?.type || 'if_output_contains'}
                                    onChange={(e) => onCommandChange(stage, index, {
                                      ...command.condition,
                                      check_condition: {
                                        ...command.condition.check_condition,
                                        type: e.target.value,
                                        operator: 'contains'
                                      }
                                    }, 'condition')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  >
                                    <option value="if_output_contains">If output contains</option>
                                    <option value="if_regex_matches">If regex matches</option>
                                    <option value="if_variable_equals">If variable equals</option>
                                  </select>
                                </div>

                                {command.condition.check_condition?.type === 'if_output_contains' && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Text to check for
                                    </label>
                                    <input
                                      type="text"
                                      value={command.condition.check_condition?.text || ''}
                                      onChange={(e) => onCommandChange(stage, index, {
                                        ...command.condition,
                                        check_condition: {
                                          ...command.condition.check_condition,
                                          text: e.target.value
                                        }
                                      }, 'condition')}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      placeholder="e.g., 'Interface is up' or 'status: active'"
                                    />
                                  </div>
                                )}

                                {command.condition.check_condition?.type === 'if_regex_matches' && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Regex Pattern
                                    </label>
                                    <input
                                      type="text"
                                      value={command.condition.check_condition?.pattern || ''}
                                      onChange={(e) => onCommandChange(stage, index, {
                                        ...command.condition,
                                        check_condition: {
                                          ...command.condition.check_condition,
                                          pattern: e.target.value
                                        }
                                      }, 'condition')}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                                      placeholder="e.g., 'status:\\s*(up|active)'"
                                    />
                                  </div>
                                )}

                                {command.condition.check_condition?.type === 'if_variable_equals' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Variable Name
                                      </label>
                                      <input
                                        type="text"
                                        value={command.condition.check_condition?.variable_name || ''}
                                        onChange={(e) => onCommandChange(stage, index, {
                                          ...command.condition,
                                          check_condition: {
                                            ...command.condition.check_condition,
                                            variable_name: e.target.value
                                          }
                                        }, 'condition')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="Variable name..."
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Expected Value
                                      </label>
                                      <input
                                        type="text"
                                        value={command.condition.check_condition?.value || ''}
                                        onChange={(e) => onCommandChange(stage, index, {
                                          ...command.condition,
                                          check_condition: {
                                            ...command.condition.check_condition,
                                            value: e.target.value
                                          }
                                        }, 'condition')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="Expected value..."
                                      />
                                    </div>
                                  </>
                                )}
                               </div>
                             </div>
        
                             {/* Loop Success Action Configuration */}
                             {command.condition.type === 'loop_until_condition' && (
                               <div className="mt-4">
                                 <label className="block text-xs font-medium text-gray-600 mb-2">
                                   Loop Success Action
                                 </label>
                                 <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                                   <div className="space-y-3">
                                     <div>
                                       <label className="block text-xs font-medium text-gray-600 mb-1">
                                         What should happen when loop succeeds?
                                       </label>
                                       <select
                                         value={command.condition.loop_success_action || 'proceed_to_next'}
                                         onChange={(e) => onCommandChange(stage, index, {
                                           ...command.condition,
                                           loop_success_action: e.target.value
                                         }, 'condition')}
                                         className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                       >
                                         <option value="proceed_to_next">Proceed to next command/stage</option>
                                         <option value="start_nested_loop">Start another loop with different conditions</option>
                                         <option value="continue_commands">Continue with additional commands</option>
                                         <option value="complete_workflow">Mark workflow as completed</option>
                                       </select>
                                     </div>
        
                                     {command.condition.loop_success_action === 'start_nested_loop' && (
                                       <div className="bg-white border border-green-200 rounded p-3">
                                         <label className="block text-xs font-medium text-gray-600 mb-1">
                                           Nested Loop Configuration
                                         </label>
                                         <div className="space-y-2">
                                           <input
                                             type="text"
                                             placeholder="Nested loop description (e.g., 'Monitor interface for 5 minutes')"
                                             value={command.condition.nested_loop_description || ''}
                                             onChange={(e) => onCommandChange(stage, index, {
                                               ...command.condition,
                                               nested_loop_description: e.target.value
                                             }, 'condition')}
                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                           />
                                           <div className="grid grid-cols-2 gap-2">
                                             <input
                                               type="number"
                                               placeholder="Max iterations"
                                               value={command.condition.nested_max_iterations || 10}
                                               onChange={(e) => onCommandChange(stage, index, {
                                                 ...command.condition,
                                                 nested_max_iterations: parseInt(e.target.value) || 10
                                               }, 'condition')}
                                               className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                               min="1"
                                             />
                                             <input
                                               type="number"
                                               placeholder="Timeout (seconds)"
                                               value={command.condition.nested_timeout_seconds || 300}
                                               onChange={(e) => onCommandChange(stage, index, {
                                                 ...command.condition,
                                                 nested_timeout_seconds: parseInt(e.target.value) || 300
                                               }, 'condition')}
                                               className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                               min="1"
                                             />
                                           </div>
                                         </div>
                                       </div>
                                     )}
        
                                     {command.condition.loop_success_action === 'continue_commands' && (
                                       <div>
                                         <label className="block text-xs font-medium text-gray-600 mb-1">
                                           Additional Commands to Execute
                                         </label>
                                         <textarea
                                           value={JSON.stringify(command.condition.success_continuation_commands || [], null, 2)}
                                           onChange={(e) => {
                                             try {
                                               const continuationCommands = JSON.parse(e.target.value);
                                               onCommandChange(stage, index, {
                                                 ...command.condition,
                                                 success_continuation_commands: Array.isArray(continuationCommands) ? continuationCommands : []
                                               }, 'condition');
                                             } catch (err) {
                                               // Invalid JSON, ignore
                                             }
                                           }}
                                           className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-mono"
                                           rows={3}
                                           placeholder='[{"command": "echo Loop completed successfully", "description": "Log success"}]'
                                         />
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             )}
                                   </>
                                 )}

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Match Operator
                          </label>
                          <select
                            value={command.condition.operator || 'contains'}
                            onChange={(e) => onCommandChange(stage, index, {
                              ...command.condition,
                              operator: e.target.value
                            }, 'condition')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="contains">Contains</option>
                            <option value="matches">Regex Matches</option>
                            <option value="equals">Equals</option>
                            <option value="starts_with">Starts With</option>
                            <option value="ends_with">Ends With</option>
                          </select>
                        </div>
                      </div>

                      {/* Loop Commands (for loop_until_condition) */}
                      {command.condition.type === 'loop_until_condition' && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Loop Commands (Execute in each iteration)
                          </h5>
                          <textarea
                            value={JSON.stringify(command.condition.loop_commands || [], null, 2)}
                            onChange={(e) => {
                              try {
                                const loopCommands = JSON.parse(e.target.value);
                                onCommandChange(stage, index, {
                                  ...command.condition,
                                  loop_commands: Array.isArray(loopCommands) ? loopCommands : []
                                }, 'condition');
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono bg-white"
                            rows={4}
                            placeholder='[{"command": "sleep 30", "description": "Wait 30 seconds"}, {"command": "show interface status", "description": "Check if interface is ready"}]'
                          />
                          <p className="text-xs text-blue-600 mt-1">
                            Commands executed in each loop iteration until exit condition is met or timeout/max iterations reached
                          </p>
                        </div>
                      )}

                      {/* Then Commands */}
                      {command.condition.type !== 'loop_until_condition' && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Then (Execute if condition is true)
                          </h5>
                          <textarea
                            value={JSON.stringify(command.condition.then || [], null, 2)}
                            onChange={(e) => {
                              try {
                                const thenCommands = JSON.parse(e.target.value);
                                onCommandChange(stage, index, {
                                  ...command.condition,
                                  then: Array.isArray(thenCommands) ? thenCommands : []
                                }, 'condition');
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-mono bg-white"
                            rows={3}
                            placeholder='[{"command": "echo Condition met - proceeding to next stage", "description": "Continue workflow"}]'
                          />
                          <p className="text-xs text-green-600 mt-1">
                            Example: Pre-check success → go to implementation. Post-check success → mark as done.
                          </p>
                        </div>
                      )}

                      {/* Success Commands (for loop_until_condition) */}
                      {command.condition.type === 'loop_until_condition' && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            On Success (Exit condition met)
                          </h5>
                          <textarea
                            value={JSON.stringify(command.condition.then || [], null, 2)}
                            onChange={(e) => {
                              try {
                                const successCommands = JSON.parse(e.target.value);
                                onCommandChange(stage, index, {
                                  ...command.condition,
                                  then: Array.isArray(successCommands) ? successCommands : []
                                }, 'condition');
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-mono bg-white"
                            rows={3}
                            placeholder='[{"command": "echo Pre-check passed - proceeding to implementation", "description": "Continue to next stage"}]'
                          />
                          <p className="text-xs text-green-600 mt-1">
                            Example: In pre-check stage → proceed to implementation. In post-check stage → mark workflow as completed.
                          </p>
                        </div>
                      )}

                      {/* Else Commands */}
                      {command.condition.type !== 'loop_until_condition' && (
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            Else (Execute if condition is false)
                          </h5>
                          <textarea
                            value={JSON.stringify(command.condition.else || [], null, 2)}
                            onChange={(e) => {
                              try {
                                const elseCommands = JSON.parse(e.target.value);
                                onCommandChange(stage, index, {
                                  ...command.condition,
                                  else: Array.isArray(elseCommands) ? elseCommands : []
                                }, 'condition');
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-mono bg-white"
                            rows={3}
                            placeholder='[{"command": "echo Condition failed - stopping workflow", "description": "Abort or rollback"}]'
                          />
                          <p className="text-xs text-red-600 mt-1">
                            Example: Pre-check failed → abort workflow. Post-check failed → trigger rollback.
                          </p>
                        </div>
                      )}

                      {/* Failure Commands (for loop_until_condition) */}
                      {command.condition.type === 'loop_until_condition' && (
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            On Failure (Timeout/Max iterations reached)
                          </h5>
                          <textarea
                            value={JSON.stringify(command.condition.else || [], null, 2)}
                            onChange={(e) => {
                              try {
                                const failureCommands = JSON.parse(e.target.value);
                                onCommandChange(stage, index, {
                                  ...command.condition,
                                  else: Array.isArray(failureCommands) ? failureCommands : []
                                }, 'condition');
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-mono bg-white"
                            rows={3}
                            placeholder='[{"command": "echo Timeout reached - triggering rollback", "description": "Execute rollback commands"}]'
                          />
                          <p className="text-xs text-red-600 mt-1">
                            Example: Trigger rollback workflow, send alert, or update status to failed
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
};

const EnhancedCreateWorkflow = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'bpmn'
  
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

  // BPMN workflow state - auto-generated from form data
  const [bpmnNodes, setBpmnNodes] = useState([]);
  const [bpmnEdges, setBpmnEdges] = useState([]);

  // Auto-generate BPMN nodes from form data
  useEffect(() => {
    const stages = ['pre_check_commands', 'implementation_commands', 'post_check_commands', 'rollback_commands'];
    const nodes = [];
    const edges = [];
    let yOffset = 100;

    // Add start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 50, y: 50 },
      data: {
        label: 'Start Workflow',
        editable: false,
        onSelect: () => {}
      }
    });

    stages.forEach((stage, stageIndex) => {
      const commands = formData[stage] || [];
      const stageName = stage.replace('_commands', '').replace('_', ' ');

      commands.forEach((command, commandIndex) => {
        if (command.command && command.command.trim()) {
          const nodeId = `${stage}_${commandIndex}`;
          const xPos = 200 + (stageIndex * 250);
          const yPos = yOffset + (commandIndex * 150);

          // Add command node
          nodes.push({
            id: nodeId,
            type: 'command',
            position: { x: xPos, y: yPos },
            data: {
              ...command,
              stage: stage.replace('_commands', ''),
              editable: true,
              onSelect: (id) => {
                console.log('Selected command node:', id);
              },
              onUpdate: (id, updates) => {
                // Update the command in form data
                const [stageName, cmdIndex] = id.split('_');
                const stageKey = `${stageName}_commands`;
                setFormData(prev => {
                  const commands = [...prev[stageKey]];
                  commands[parseInt(cmdIndex)] = { ...commands[parseInt(cmdIndex)], ...updates };
                  return {
                    ...prev,
                    [stageKey]: commands
                  };
                });
              }
            }
          });

          // Add edges between commands in the same stage
          if (commandIndex > 0) {
            const prevNodeId = `${stage}_${commandIndex - 1}`;
            edges.push({
              id: `edge_${prevNodeId}_${nodeId}`,
              source: prevNodeId,
              target: nodeId,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
              markerEnd: {
                type: 'arrowclosed',
                color: '#6366f1',
              }
            });
          }

          // Add condition nodes if they exist
          if (command.condition) {
            const conditionNodeId = `condition_${stage}_${commandIndex}`;
            let conditionLabel = '';
            let trueLabel = 'Then';
            let falseLabel = 'Else';

            if (command.condition.type === 'loop_until_condition') {
              conditionLabel = `Loop until: ${command.condition.check_condition?.text || command.condition.check_condition?.pattern || 'condition met'}`;
              trueLabel = 'Success';
              falseLabel = 'Timeout/Failed';
            } else {
              conditionLabel = command.condition.pattern || command.condition.text || command.condition.variable_name || '';
            }

            nodes.push({
              id: conditionNodeId,
              type: command.condition.type === 'loop_until_condition' ? 'loop' : 'condition',
              position: { x: xPos + 200, y: yPos },
              data: {
                label: command.condition.type === 'loop_until_condition'
                  ? `Loop (${command.condition.max_iterations || 10} max, ${(command.condition.timeout_seconds || 600) / 60}min timeout)`
                  : `Condition for ${stageName} Command ${commandIndex + 1}`,
                condition: conditionLabel,
                trueLabel: trueLabel,
                falseLabel: falseLabel,
                editable: true,
                commandIndex,
                stage,
                loopConfig: command.condition.type === 'loop_until_condition' ? {
                  maxIterations: command.condition.max_iterations || 10,
                  timeoutSeconds: command.condition.timeout_seconds || 600,
                  checkCondition: command.condition.check_condition
                } : null,
                onUpdate: (nodeId, data) => {
                  console.log('Condition updated:', nodeId, data);
                },
                onSelect: (nodeId) => {
                  console.log('Condition selected:', nodeId);
                }
              }
            });

            // Connect command to condition
            edges.push({
              id: `edge_${nodeId}_${conditionNodeId}`,
              source: nodeId,
              target: conditionNodeId,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#f59e0b', strokeWidth: 2 },
              markerEnd: {
                type: 'arrowclosed',
                color: '#f59e0b',
              }
            });
          }
        }
      });

      yOffset += (commands.length * 150) + 50;
    });

    // Add end node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: 800, y: yOffset },
      data: {
        label: 'End Workflow',
        editable: false,
        onSelect: () => {}
      }
    });

    setBpmnNodes(nodes);
    setBpmnEdges(edges);
  }, [formData]);

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
      if (field === 'condition') {
        // Special handling for condition updates
        commands[index] = {
          ...commands[index],
          condition: value
        };
      } else {
        commands[index] = {
          ...commands[index],
          [field]: value
        };
      }
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

  // Add condition after a command
  const addCondition = useCallback((stage, commandIndex) => {
    // Add conditional logic to the command in form data
    setFormData(prev => {
      const commands = [...prev[stage]];
      if (commands[commandIndex]) {
        commands[commandIndex] = {
          ...commands[commandIndex],
          condition: {
            type: 'if_regex_matches',
            pattern: '',
            operator: 'contains',
            then: [],
            else: []
          }
        };
      }
      return {
        ...prev,
        [stage]: commands
      };
    });

    // Also create a condition node in BPMN view for visualization
    const conditionNode = {
      id: `condition_${stage}_${commandIndex}_${Date.now()}`,
      type: 'condition',
      position: { x: 300 + (commandIndex * 200), y: 200 + (commandIndex * 100) },
      data: {
        label: `Condition for ${stage.replace('_commands', '').replace('_', ' ')} Command ${commandIndex + 1}`,
        condition: '',
        trueLabel: 'Then',
        falseLabel: 'Else',
        editable: true,
        commandIndex,
        stage,
        onUpdate: (nodeId, data) => {
          // Update the condition in form data when BPMN node is updated
          console.log('Condition updated:', nodeId, data);
        },
        onSelect: (nodeId) => {
          // Handle node selection
          console.log('Condition selected:', nodeId);
        }
      }
    };

    setBpmnNodes(prev => [...prev, conditionNode]);
    toast.success('If/Else condition added to command! You can now configure it in the form.');
  }, []);

  // Add a standalone condition node to BPMN view
  const addBpmnCondition = useCallback(() => {
    const conditionNode = {
      id: `condition_${Date.now()}`,
      type: 'condition',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: {
        label: 'New Condition',
        condition: '',
        trueLabel: 'Yes',
        falseLabel: 'No',
        editable: true,
        onUpdate: (nodeId, data) => {
          // Update condition node data
          setBpmnNodes(prev => prev.map(node =>
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
          ));
        },
        onSelect: (nodeId) => {
          console.log('Condition selected:', nodeId);
        }
      }
    };

    setBpmnNodes(prev => [...prev, conditionNode]);
    toast.success('Condition node added to BPMN view! Connect it to commands.');
  }, []);

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Workflow Template</h1>
              <p className="mt-2 text-gray-600">
                Create a workflow template with commands and regex patterns for output validation
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-white rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setViewMode('form')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'form'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Form View
              </button>
              <button
                onClick={() => setViewMode('bpmn')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'bpmn'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                BPMN View
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'form' ? (
          /* Form View */
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
              
              <EnhancedCommandEditor
                stage="pre_check_commands"
                title="Pre-Check Commands"
                description="Commands to verify the current state"
                commands={formData.pre_check_commands}
                onCommandChange={handleCommandChange}
                onAddCommand={addCommand}
                onRemoveCommand={removeCommand}
                onAddCondition={addCondition}
              />
              
              <EnhancedCommandEditor
                stage="implementation_commands"
                title="Implementation Commands"
                description="Commands that make the actual changes"
                commands={formData.implementation_commands}
                onCommandChange={handleCommandChange}
                onAddCommand={addCommand}
                onRemoveCommand={removeCommand}
                onAddCondition={addCondition}
              />
              
              <EnhancedCommandEditor
                stage="post_check_commands"
                title="Post-Check Commands"
                description="Commands to verify the changes"
                commands={formData.post_check_commands}
                onCommandChange={handleCommandChange}
                onAddCommand={addCommand}
                onRemoveCommand={removeCommand}
                onAddCondition={addCondition}
              />
              
              <EnhancedCommandEditor
                stage="rollback_commands"
                title="Rollback Commands"
                description="Commands to revert changes"
                commands={formData.rollback_commands}
                onCommandChange={handleCommandChange}
                onAddCommand={addCommand}
                onRemoveCommand={removeCommand}
                onAddCondition={addCondition}
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
                <span className="text-lg font-semibold text-yellow-900">
                  Conditions: {bpmnNodes.filter(n => n.type === 'condition').length}
                </span>
                <span className="text-lg font-semibold text-orange-900">
                  Loops: {bpmnNodes.filter(n => n.type === 'loop').length}
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
        ) : (
          /* BPMN View */
          <div className="bg-white rounded-lg shadow-sm border" style={{ height: '800px' }}>
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">BPMN Workflow Designer</h2>
              <p className="text-sm text-gray-600 mt-1">
                Visual workflow designer with if/else conditions and conditional execution paths
              </p>
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                💡 <strong>How to connect nodes:</strong> Drag from the blue dots on node edges to create connections. Click "Add Node" to add new elements.
              </div>
            </div>

            <div className="h-full" style={{ height: 'calc(100% - 120px)' }}>
              <BPMNWorkflow
                workflow={formData}
                nodes={bpmnNodes}
                edges={bpmnEdges}
                onNodesChange={setBpmnNodes}
                onEdgesChange={setBpmnEdges}
                editable={true}
              />
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">💡 Tip:</span> Add commands in Form View, then use BPMN to create conditional flows
                  </div>
                  <button
                    onClick={addBpmnCondition}
                    className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Condition
                  </button>
                </div>
                <button
                  onClick={() => setViewMode('form')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Switch to Form View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCreateWorkflow;