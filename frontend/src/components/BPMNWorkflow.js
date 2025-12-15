import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  PlayIcon,
  StopIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

// Custom node components
import CommandNode from './nodes/CommandNode';
import ConditionNode from './nodes/ConditionNode';
import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';

const nodeTypes = {
  command: CommandNode,
  condition: ConditionNode,
  start: StartNode,
  end: EndNode,
};

const BPMNWorkflow = ({
  workflow,
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  editable = false,
  readOnly = false,
}) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
  const [addNodePosition, setAddNodePosition] = useState({ x: 0, y: 0 });

  // Initialize nodes and edges
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Handle node click
  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(event, node);
    }
  }, [onNodeClick]);

  // Handle connect
  const handleConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#6366f1',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      if (onConnect) {
        onConnect(params);
      }
    },
    [setEdges, onConnect]
  );

  // Handle node change
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChangeInternal(changes);
      if (onNodesChange) {
        onNodesChange(changes);
      }
    },
    [onNodesChangeInternal, onNodesChange]
  );

  // Handle edge change
  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        onEdgesChange(changes);
      }
    },
    [onEdgesChangeInternal, onEdgesChange]
  );

  // Add new node at position
  const addNodeAtPosition = useCallback((nodeType, position) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position,
      data: {
        label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
        editable,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowAddNodeMenu(false);
  }, [setNodes, editable]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (selectedNode && editable) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  }, [selectedNode, editable, setNodes, setEdges]);

  // Duplicate selected node
  const duplicateSelectedNode = useCallback(() => {
    if (selectedNode && editable) {
      const newNode = {
        ...selectedNode,
        id: `node_${Date.now()}`,
        position: {
          x: selectedNode.position.x + 50,
          y: selectedNode.position.y + 50,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
  }, [selectedNode, editable, setNodes]);

  // Custom node styles based on type
  const getNodeStyle = (nodeType) => {
    const styles = {
      command: {
        background: '#f0f9ff',
        border: '2px solid #0ea5e9',
        borderRadius: '8px',
      },
      condition: {
        background: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: '50%',
        width: '120px',
        height: '120px',
      },
      start: {
        background: '#dcfce7',
        border: '2px solid #22c55e',
        borderRadius: '50%',
        width: '80px',
        height: '80px',
      },
      end: {
        background: '#fee2e2',
        border: '2px solid #ef4444',
        borderRadius: '50%',
        width: '80px',
        height: '80px',
      },
    };
    return styles[nodeType] || styles.command;
  };

  // MiniMap styles
  const minimapStyle = {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  // Control styles
  const controlsStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  };

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-gray-50"
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls style={controlsStyle} />
        <MiniMap style={minimapStyle} />
        
        {/* Custom Panels */}
        <Panel position="top-left">
          <div className="bg-white rounded-lg shadow-lg p-4 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {workflow?.name || 'Workflow'}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Nodes: {nodes.length}</span>
              <span>•</span>
              <span>Edges: {edges.length}</span>
            </div>
          </div>
        </Panel>

        {/* Edit Controls */}
        {editable && (
          <Panel position="top-right">
            <div className="bg-white rounded-lg shadow-lg p-3 border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddNodeMenu(!showAddNodeMenu)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Node
                </button>
                
                {selectedNode && (
                  <>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={duplicateSelectedNode}
                      className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={deleteSelectedNode}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* Add Node Menu */}
        {showAddNodeMenu && (
          <Panel position="top-center">
            <div className="bg-white rounded-lg shadow-lg p-4 border">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Add New Node
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => addNodeAtPosition('command', { x: 250, y: 100 })}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                >
                  Command
                </button>
                <button
                  onClick={() => addNodeAtPosition('condition', { x: 250, y: 200 })}
                  className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 text-sm"
                >
                  Condition
                </button>
                <button
                  onClick={() => addNodeAtPosition('start', { x: 50, y: 150 })}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                >
                  Start
                </button>
                <button
                  onClick={() => addNodeAtPosition('end', { x: 500, y: 150 })}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                >
                  End
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* Legend */}
        <Panel position="bottom-left">
          <div className="bg-white rounded-lg shadow-lg p-3 border">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
                <span>Command</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded-full"></div>
                <span>Condition</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded-full"></div>
                <span>Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded-full"></div>
                <span>End</span>
              </div>
            </div>
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              <strong>💡 How to connect:</strong><br/>
              Drag from blue dots on node edges to create connections
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Selected Node Details Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedNode.data.label || selectedNode.type}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Node ID
              </label>
              <div className="text-sm text-gray-600 font-mono">
                {selectedNode.id}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <div className="text-sm text-gray-600 capitalize">
                {selectedNode.type}
              </div>
            </div>
            
            {selectedNode.data.command && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Command
                </label>
                <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                  {selectedNode.data.command}
                </div>
              </div>
            )}
            
            {selectedNode.data.condition && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                  {selectedNode.data.condition}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>
                <span className="font-medium">X:</span> {Math.round(selectedNode.position.x)}
              </div>
              <div>
                <span className="font-medium">Y:</span> {Math.round(selectedNode.position.y)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BPMNWorkflow;