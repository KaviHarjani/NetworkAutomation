import React from 'react';
import { Handle, Position } from 'reactflow';
import { PlayIcon } from '@heroicons/react/24/outline';

const StartNode = ({ id, data, selected }) => {
  return (
    <div
      className={`
        bg-white border-2 rounded-full shadow-lg p-4 cursor-pointer relative
        ${selected ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}
        hover:border-green-400 transition-colors
      `}
      style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => data.onSelect?.(id)}
    >
      {/* Large connection handles on all 4 sides */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-green-500 border-2 border-white hover:bg-green-600 transition-colors"
        style={{ top: '-10px' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        className="w-5 h-5 bg-green-500 border-2 border-white hover:bg-green-600 transition-colors"
        style={{ right: '-10px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-5 h-5 bg-green-500 border-2 border-white hover:bg-green-600 transition-colors"
        style={{ bottom: '-10px' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-5 h-5 bg-green-500 border-2 border-white hover:bg-green-600 transition-colors"
        style={{ left: '-10px' }}
      />
      
      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <PlayIcon className="w-6 h-6 text-green-600" />
        </div>
        <div className="text-xs font-semibold text-gray-900">Start</div>
        <div className="text-xs text-gray-500 mt-1">
          {data.label || 'Workflow Start'}
        </div>
      </div>
    </div>
  );
};

export default StartNode;