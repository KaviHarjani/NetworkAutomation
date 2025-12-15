# BPMN Workflow Implementation with If/Else Logic

This document outlines the implementation of if/else logic and BPMN workflow visualization for the Network Automation Tool.

## Overview

The enhanced workflow system now supports:
- **If/Else Conditions**: Add conditional logic after each step in workflow creation
- **BPMN Visualization**: Visual workflow designer with drag-and-drop interface
- **Conditional Execution Paths**: Different execution paths based on condition evaluation
- **Enhanced Command Editor**: Inline editing with variable references and validation

## Features Implemented

### 1. Backend Models (`automation/models.py`)
- `WorkflowNode`: Represents workflow steps, conditions, start/end points
- `WorkflowEdge`: Represents connections between nodes
- `WorkflowExecutionPath`: Tracks execution paths taken during workflow runs

### 2. API Serializers (`automation/serializers.py`)
- Enhanced `WorkflowSerializer` with BPMN data support
- `WorkflowNodeSerializer`, `WorkflowEdgeSerializer` for API communication
- `BPMNWorkflowSerializer` for complete workflow data

### 3. API Endpoints (`automation/bpmn_viewsets.py`)
- `WorkflowNodeViewSet`: CRUD operations for workflow nodes
- `WorkflowEdgeViewSet`: Manage connections between nodes
- `BPMNWorkflowViewSet`: Complete BPMN workflow management
- `WorkflowExecutionPathViewSet`: Track execution flows

### 4. Frontend Components

#### BPMN Workflow Designer (`frontend/src/components/BPMNWorkflow.js`)
- Interactive workflow canvas using React Flow
- Drag-and-drop node creation
- Real-time workflow visualization
- Node and edge editing capabilities

#### Custom Node Components (`frontend/src/components/nodes/`)
- `CommandNode.js`: Command execution nodes with inline editing
- `ConditionNode.js`: If/else condition nodes with true/false branches
- `StartNode.js` & `EndNode.js`: Workflow start and end markers

#### Enhanced Workflow Creation (`frontend/src/pages/EnhancedCreateWorkflow.js`)
- Dual-view interface: Form View + BPMN View
- "Add If/Else" buttons after each command
- Seamless switching between form and visual editing
- Real-time condition counting and validation

### 5. URL Routing
- Updated `frontend/src/App.js` with new enhanced workflow creation route
- Backend API endpoints registered in `automation/api_urls.py`

## Usage Instructions

### 1. Creating Workflows with If/Else Logic

1. Navigate to `/workflows/create/enhanced` to access the enhanced workflow creator
2. In **Form View**, add commands as usual
3. Click "Add If/Else" button after any command to create a condition
4. Switch to **BPMN View** to see the visual workflow representation
5. Configure conditions by clicking on condition nodes
6. Connect nodes to create execution paths

### 2. Condition Configuration

Conditions use variable reference syntax:
```
{interface_status} == "up"
{vlan_id} != "100"
{speed} >= "1000"
```

Available operators:
- `==` (equals)
- `!=` (not equals)
- `>` (greater than)
- `<` (less than)
- `>=` (greater than or equal)
- `<=` (less than or equal)

### 3. BPMN Workflow Editing

**Adding Nodes:**
- Click "Add Node" button in the top-right panel
- Choose node type: Command, Condition, Start, End

**Connecting Nodes:**
- Drag from output handle to input handle of another node
- Conditional nodes have separate handles for true/false paths

**Editing Nodes:**
- Click on any node to select it
- Use the edit button to modify node properties
- Edit command details, conditions, or labels

**Deleting Nodes:**
- Select a node and click the delete button
- Connected edges are automatically removed

## API Endpoints

### BPMN Workflow Management
```
GET    /api/bpmn-workflows/{workflow_id}/get_bpmn_data/
POST   /api/bpmn-workflows/{workflow_id}/save_bpmn_data/
POST   /api/bpmn-workflows/{workflow_id}/convert_from_linear/
```

### Node Management
```
GET    /api/workflow-nodes/?workflow_id={workflow_id}
POST   /api/workflow-nodes/
PUT    /api/workflow-nodes/{node_id}/
DELETE /api/workflow-nodes/{node_id}/
POST   /api/workflow-nodes/{node_id}/duplicate/
POST   /api/workflow-nodes/{node_id}/move/
```

### Edge Management
```
GET    /api/workflow-edges/?workflow_id={workflow_id}
POST   /api/workflow-edges/
PUT    /api/workflow-edges/{edge_id}/
DELETE /api/workflow-edges/{edge_id}/
POST   /api/workflow-edges/{edge_id}/connect/
```

### Execution Path Tracking
```
GET /api/execution-paths/?execution_id={execution_id}
GET /api/execution-paths/get_execution_flow/?execution_id={execution_id}
```

## Setup Instructions

### 1. Install Dependencies

Activate the virtual environment and install required packages:
```bash
# Activate virtual environment (adjust path as needed)
source /path/to/venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
```

### 2. Database Migration

Create and apply migrations for the new models:
```bash
python manage.py makemigrations automation
python manage.py migrate
```

### 3. Start Development Servers

Backend:
```bash
python manage.py run:
```bash
server
```

Frontendcd frontend
npm start
```

### 4. Access Enhanced Workflow Creation

Navigate to: `http://localhost:3000/workflows/create/enhanced`

## Workflow Execution Logic

When a workflow with conditions is executed:

1. **Linear to BPMN Conversion**: Linear workflows are automatically converted to BPMN format
2. **Condition Evaluation**: Variables from previous commands are used to evaluate conditions
3. **Path Selection**: Execution follows the appropriate path based on condition results
4. **Path Tracking**: Each execution path is recorded for audit and debugging

## Example Use Cases

### 1. Interface Status Check
```
Command 1: show interface status
Condition: {interface_status} == "up"
├─ True: Continue with configuration
└─ False: Skip to rollback
```

### 2. VLAN Validation
```
Command 1: show vlan {vlan_id}
Condition: {vlan_exists} == "true"
├─ True: Proceed with changes
└─ False: Error handling
```

### 3. Speed/Duplex Configuration
```
Command 1: show interface speed
Condition: {current_speed} >= "1000"
├─ True: Set duplex full
└─ False: Set duplex auto
```

## Benefits

1. **Visual Workflow Design**: Intuitive drag-and-drop interface
2. **Conditional Logic**: Handle complex decision-making scenarios
3. **Audit Trail**: Track execution paths for debugging
4. **Flexibility**: Switch between form and visual editing modes
5. **Reusability**: Conditions can reference variables from any previous command

## Future Enhancements

1. **Parallel Execution**: Support for parallel task execution
2. **Loop Constructs**: For/while loop nodes for repeated operations
3. **Error Handling**: Enhanced error handling with retry mechanisms
4. **Template Library**: Pre-built workflow templates with common patterns
5. **Collaboration**: Real-time collaborative workflow editing

## Troubleshooting

### Common Issues

1. **Missing Dependencies**: Ensure all Python and Node.js dependencies are installed
2. **Database Issues**: Run migrations if models are not recognized
3. **Frontend Build**: Clear node_modules and reinstall if React Flow doesn't work
4. **CORS Issues**: Check CORS settings for API communication

### Debug Mode

Enable Django debug mode in development:
```python
DEBUG = True
```

This provides detailed error messages and stack traces for troubleshooting.

## Conclusion

The enhanced workflow system with BPMN visualization and if/else logic provides a powerful, intuitive way to design and manage complex network automation workflows. The dual-view interface allows users to choose between form-based and visual editing based on their preference and workflow complexity.