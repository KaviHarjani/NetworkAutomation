import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  ArrowPathIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ConditionNode = ({ id, data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [condition, setCondition] = useState(data.condition || '');
  const [trueLabel, setTrueLabel] = useState(data.trueLabel || 'Yes');
  const [falseLabel, setFalseLabel] = useState(data.falseLabel || 'No');

  const handleSave = () => {
    data.onUpdate?.(id, { condition, trueLabel, falseLabel });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCondition(data.condition || '');
    setTrueLabel(data.trueLabel || 'Yes');
    setFalseLabel(data.falseLabel || 'No');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-yellow-500 rounded-lg shadow-lg p-4 min-w-64 relative">
        {/* Large connection handles on all 4 sides */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
          style={{ top: '-10px' }}
        />
        <Handle
          type="target"
          position={Position.Right}
          className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
          style={{ right: '-10px' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
          style={{ bottom: '-10px', right: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
          style={{ bottom: '-10px', left: '30%' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
          style={{ left: '-10px' }}
        />
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition Expression
          </label>
          <textarea
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g., {interface_status} == 'up'"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
            rows={2}
          />
          <div className="text-xs text-gray-500 mt-1">
            Use {'{variable_name}'} syntax to reference variables
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              True Label
            </label>
            <input
              type="text"
              value={trueLabel}
              onChange={(e) => setTrueLabel(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              False Label
            </label>
            <input
              type="text"
              value={falseLabel}
              onChange={(e) => setFalseLabel(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
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
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
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
        bg-white border-2 rounded-full shadow-lg p-4 cursor-pointer relative
        ${selected ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-300'}
        hover:border-yellow-400 transition-colors
      `}
      style={{ width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => data.onSelect?.(id)}
    >
      {/* Large connection handles on all 4 sides */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
        style={{ top: '-10px' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="true"
        className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
        style={{ right: '-10px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
        style={{ bottom: '-10px' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="false"
        className="w-5 h-5 bg-yellow-500 border-2 border-white hover:bg-yellow-600 transition-colors"
        style={{ left: '-10px' }}
      />
      
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          <ArrowPathIcon className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="text-xs font-semibold text-gray-900 mb-1">Condition</div>
        
        {condition ? (
          <div className="text-xs text-gray-600 font-mono break-words px-2">
            {condition.length > 30 ? `${condition.substring(0, 30)}...` : condition}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">
            No condition
          </div>
        )}
        
        <div className="flex justify-between mt-2 text-xs">
          <div className="flex items-center gap-1">
            <CheckIcon className="w-3 h-3 text-green-600" />
            <span className="text-green-600">{trueLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <XMarkIcon className="w-3 h-3 text-red-600" />
            <span className="text-red-600">{falseLabel}</span>
          </div>
        </div>
      </div>
      
      {data.editable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="absolute top-1 right-1 text-gray-400 hover:text-yellow-600"
        >
          <PencilIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default ConditionNode;