
'use client'

import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  EdgeTypes,
  MiniMap,
  Controls,
  Background,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import TaskNode from '@/components/diagrams/TaskNode';
import InputNode from '@/components/diagrams/InputNode';

import CustomEdge from '@/components/diagrams/CustomEdge';
import OutputNode from '@/components/diagrams/OutputNode';

const nodeTypes = {
  TaskNode: TaskNode,
  InputNode:InputNode,
  OutputNode:OutputNode
  
};
const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge
};

const initNodes = [
  
   {
    id: '1',
    type: 'InputNode',
    data: {  nodelabel:"Inputs", inputs:["length", "types"] },
    position: { x: 100, y: 200 },
  },

  
   {
    id: '2',
    type: 'TaskNode',
    data: { nodelabel:"Step1", inputs:["length", "types"],outputs:["stepR"] },
    position: { x: 300, y: 250 },
  },
  {
    id: '3',
    type: 'TaskNode',
    data: { nodelabel:"Step2", inputs:["stepR", "types"],outputs:["bytes"] },
    position: { x: 600, y: 250 },
  },
  {
    id: '4',
    type: 'OutputNode',
    data: {nodelabel:"Outputs", outputs:["bytes"] },
    position: { x: 800, y: 200 },
  },
  
];

const initEdges = [
 {
    id: 'e1-2a',
    source: '1',
    target: '2',
    animated: true,
    sourcehandle:'input2',
    type : "customEdge",
  },
  {
    id: 'e1-2b',
    source: '1',
    target: '2',
    animated: false,
    sourcehandle:'input1',
    type : "customEdge",
    
  }
  
  
];

export const DiagramViewer = (props:any) => {
       const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
      const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
      
      
   
      return (
        <div style={{ width: '100%', height: '500px' }}>
           
           <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesConnectable={false}
                className="bg-slate-800"
              >
                <Background/>
                <Controls />
              </ReactFlow>
        </div>
      );
    
};

