import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  PlayIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

import BPMNWorkflow from '../components/BPMNWorkflow';
import StatusBadge from '../components/StatusBadge';
import { workflowAPI } from '../services/api';
import toast from 'react-hot-toast';

const BPMNWorkflowView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('visual'); // 'visual' or 'code'
  const [isConverting, setIsConverting] = useState(false);

  // Fetch workflow BPMN data
  const { data, isLoading, error, refetch } = useQuery(
    ['workflow-bpmn', id],
    async () => {
      try {
        // First try to get BPMN data
        const response = await fetch(`/api/bpmn-workflows/${id}/get_bpmn_data/`);
        if (response.ok) {
          return response.json();
        } else {
          // If no BPMN data exists, convert from linear
          throw new Error('No BPMN data found');
        }
      } catch (error) {
        // Convert from linear workflow if BPMN doesn't exist
        const convertResponse = await fetch(`/api/bpmn-workflows/${id}/convert_from_linear/`, {
          method: 'POST',
        });
        if (convertResponse.ok) {
          // Retry getting BPMN data after conversion
          const retryResponse = await fetch(`/api/bpmn-workflows/${id}/get_bpmn_data/`);
          return retryResponse.json();
        } else {
          throw new Error('Failed to convert workflow to BPMN format');
        }
      }
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const bpmnData = data?.data;

  // Convert workflow to BPMN format
  const handleConvertToBPMN = async () => {
    setIsConverting(true);
    try {
      const response = await fetch(`/api/bpmn-workflows/${id}/convert_from_linear/`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Workflow converted to BPMN format!');
        refetch();
      } else {
        toast.error('Failed to convert workflow to BPMN format');
      }
    } catch (error) {
      toast.error('Error converting workflow: ' + error.message);
    } finally {
      setIsConverting(false);
    }
  };

  // Save BPMN changes
  const handleSaveBPMN = async (nodes, edges) => {
    try {
      const response = await fetch(`/api/bpmn-workflows/${id}/save_bpmn_data/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes,
          edges: edges,
        }),
      });

      if (response.ok) {
        toast.success('BPMN workflow saved successfully!');
      } else {
        toast.error('Failed to save BPMN workflow');
      }
    } catch (error) {
      toast.error('Error saving BPMN workflow: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !bpmnData) {
    toast.error('Failed to load BPMN workflow data');
    return (
      <div className="text-center py-12">
        <DocumentDuplicateIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          BPMN Workflow Not Available
        </h3>
        <p className="text-gray-500 mb-4">
          This workflow doesn't have BPMN data yet. You can convert it from linear format.
        </p>
        <div className="flex justify-center space-x-3">
          <button
            onClick={handleConvertToBPMN}
            disabled={isConverting}
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg inline-flex items-center disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            {isConverting ? 'Converting...' : 'Convert to BPMN'}
          </button>
          <Link
            to={`/workflows/${id}`}
            className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-lg inline-flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Workflow
          </Link>
        </div>
      </div>
    );
  }

  const { workflow, nodes, edges } = bpmnData;

  // Convert BPMN data to React Flow format
  const reactFlowNodes = nodes.map(node => ({
    id: node.id,
    type: node.node_type,
    position: { x: node.position_x, y: node.position_y },
    data: {
      label: node.name,
      command: node.command,
      stage: node.stage,
      regex_pattern: node.regex_pattern,
      operator: node.operator,
      expected_output: node.expected_output,
      is_dynamic: node.is_dynamic,
      store_in_variable: node.store_in_variable,
      variable_description: node.variable_description,
      condition: node.condition_expression,
      condition_variables: node.condition_variables_list || [],
      editable: true,
      onUpdate: (nodeId, data) => {
        // Handle node updates
        console.log('Node updated:', nodeId, data);
      },
      onSelect: (nodeId) => {
        // Handle node selection
        console.log('Node selected:', nodeId);
      }
    },
    width: node.width,
    height: node.height,
  }));

  const reactFlowEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source_node,
    target: edge.target_node,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: {
      type: 'arrowclosed',
      color: '#6366f1',
    },
    label: edge.label,
    data: {
      edge_type: edge.edge_type,
      condition_expression: edge.condition_expression,
    }
  }));

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
            <h1 className="text-3xl font-bold text-gray-900">
              {workflow.name} - BPMN View
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <StatusBadge status={workflow.status} type="workflow" />
              <div className="flex items-center text-sm text-gray-500">
                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                BPMN Workflow Designer
              </div>
              <div className="text-sm text-gray-500">
                {nodes.length} nodes, {edges.length} connections
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Link
            to={`/workflows/${id}/edit`}
            className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Workflow
          </Link>
          <Link
            to={`/workflows/execute?workflow=${id}`}
            className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Execute
          </Link>
        </div>
      </div>

      {/* BPMN Workflow Canvas */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Workflow Designer</h2>
              <p className="text-sm text-gray-600 mt-1">
                Visual workflow with if/else conditions and execution paths
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'visual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'code'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  JSON
                </button>
              </div>
              
              <button
                onClick={() => handleSaveBPMN(reactFlowNodes, reactFlowEdges)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-96">
          {viewMode === 'visual' ? (
            <BPMNWorkflow
              workflow={workflow}
              nodes={reactFlowNodes}
              edges={reactFlowEdges}
              editable={true}
            />
          ) : (
            <div className="h-full p-4 bg-gray-50 overflow-auto">
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
                <pre>{JSON.stringify(bpmnData, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>📊 Nodes: {nodes.length}</span>
              <span>🔗 Connections: {edges.length}</span>
              <span>⚡ Conditions: {nodes.filter(n => n.node_type === 'condition').length}</span>
            </div>
            <div>
              💡 <strong>Tip:</strong> Click "Add If/Else" in workflow creation to add conditional logic
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-blue-600">
            {nodes.filter(n => n.node_type === 'command').length}
          </div>
          <div className="text-sm text-gray-600">Command Nodes</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-yellow-600">
            {nodes.filter(n => n.node_type === 'condition').length}
          </div>
          <div className="text-sm text-gray-600">Condition Nodes</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-green-600">
            {nodes.filter(n => n.node_type === 'start').length}
          </div>
          <div className="text-sm text-gray-600">Start Nodes</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-2xl font-bold text-red-600">
            {nodes.filter(n => n.node_type === 'end').length}
          </div>
          <div className="text-sm text-gray-600">End Nodes</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/workflows/create/enhanced"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <DocumentDuplicateIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Create New Workflow</div>
              <div className="text-xs text-gray-500">Start with enhanced BPMN creation</div>
            </div>
          </Link>
          
          <button
            onClick={handleConvertToBPMN}
            disabled={isConverting}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <div className="text-center">
              <ArrowPathIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Reconvert Workflow</div>
              <div className="text-xs text-gray-500">Update BPMN from current commands</div>
            </div>
          </button>
          
          <Link
            to={`/workflows/${id}/edit`}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            <div className="text-center">
              <PencilIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Edit Commands</div>
              <div className="text-xs text-gray-500">Modify workflow commands</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BPMNWorkflowView;