import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  CommandLineIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const CommandNode = ({ id, data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [command, setCommand] = useState(data.command || '');
  const [stage, setStage] = useState(data.stage || 'implementation');

  const handleSave = () => {
    data.onUpdate?.(id, { command, stage });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCommand(data.command || '');
    setStage(data.stage || 'implementation');
    setIsEditing(false);
  };

  const getStageColor = (stage) => {
    const colors = {
      pre_check: 'bg-blue-100 text-blue-800',
      implementation: 'bg-green-100 text-green-800',
      post_check: 'bg-purple-100 text-purple-800',
      rollback: 'bg-orange-100 text-orange-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage) => {
    const labels = {
      pre_check: 'Pre-Check',
      implementation: 'Implementation',
      post_check: 'Post-Check',
      rollback: 'Rollback',
    };
    return labels[stage] || stage;
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 min-w-64 relative">
        {/* Large connection handles on all 4 sides */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
          style={{ top: '-10px' }}
        />
        <Handle
          type="target"
          position={Position.Right}
          className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
          style={{ right: '-10px' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
          style={{ bottom: '-10px' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
          style={{ left: '-10px' }}
        />
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stage
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="pre_check">Pre-Check</option>
            <option value="implementation">Implementation</option>
            <option value="post_check">Post-Check</option>
            <option value="rollback">Rollback</option>
          </select>
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Command
          </label>
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command..."
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white border-2 rounded-lg shadow-lg p-4 min-w-64 cursor-pointer relative
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
        hover:border-blue-400 transition-colors
      `}
      onClick={() => data.onSelect?.(id)}
    >
      {/* Large connection handles on all 4 sides */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
        style={{ top: '-10px' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
        style={{ right: '-10px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
        style={{ bottom: '-10px' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-5 h-5 bg-blue-500 border-2 border-white hover:bg-blue-600 transition-colors"
        style={{ left: '-10px' }}
      />
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <CommandLineIcon className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Command</span>
        </div>
        {data.editable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="text-gray-400 hover:text-blue-600"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="mb-2">
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStageColor(stage)}`}>
          {getStageLabel(stage)}
        </span>
      </div>
      
      {command ? (
        <div className="bg-gray-50 rounded p-2">
          <div className="text-sm text-gray-700 font-mono break-words">
            {command.length > 50 ? `${command.substring(0, 50)}...` : command}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">
          No command specified
        </div>
      )}

      {/* Show regex pattern */}
      {data.regex_pattern && (
        <div className="mt-2 text-xs text-purple-600 bg-purple-50 p-1 rounded">
          <span className="font-medium">Regex:</span> {data.regex_pattern.length > 30 ? `${data.regex_pattern.substring(0, 30)}...` : data.regex_pattern}
        </div>
      )}

      {/* Show variable storage */}
      {data.store_in_variable && (
        <div className="mt-1 text-xs text-blue-600 bg-blue-50 p-1 rounded">
          <span className="font-medium">→ Variable:</span> {data.store_in_variable}
        </div>
      )}

      {/* Show condition */}
      {data.condition && (
        <div className="mt-1 text-xs text-yellow-700 bg-yellow-50 p-1 rounded">
          <span className="font-medium">⚡ Condition:</span> {data.condition.type?.replace(/_/g, ' ')}
        </div>
      )}

      {/* Show dynamic parameters */}
      {data.is_dynamic && (
        <div className="mt-1 text-xs text-green-600 bg-green-50 p-1 rounded">
          <span className="font-medium">🔄 Dynamic</span>
        </div>
      )}
    </div>
  );
};

export default CommandNode;