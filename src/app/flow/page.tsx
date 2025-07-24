'use client'

import React, { useCallback } from 'react';
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

import '@xyflow/react/dist/base.css';

import TaskNode from '@/components/diagrams/TaskNode';
import InputNode from '@/components/diagrams/InputNode';

import CustomEdge from '@/components/diagrams/CustomEdge';
import OutputNode from '@/components/diagrams/OutputNode';

import '../../../tailwind-config';

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
    data: {  nodelabel:"Inputs", inputs:["length", "type"] },
    position: { x: 100, y: 200 },
  },

  
   {
    id: '2',
    type: 'TaskNode',
    data: { nodelabel:"Step1", inputs:["Task1.Output1", "Task1.Output2"],outputs:["Output1"] },
    position: { x: 400, y: 150 },
  },
  {
    id: '3',
    type: 'TaskNode',
    data: { nodelabel:"Step2", inputs:["Task1.Output2"],outputs:["Output2"] },
    position: { x: 400, y: 350 },
  },
  {
    id: '4',
    type: 'OutputNode',
    data: {nodelabel:"Outputs", outputs:["Output1", "Output2"] },
    position: { x: 700, y: 200 },
  },
  
];

const initEdges = [
 {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    sourceHandle: 'input1',
    type : "customEdge",
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    sourceHandle: 'input2',
    animated: true,
    type : "customEdge",
    
  },
   {
    id: 'e2-4',
    source: '2',
    target: '4',
    targetHandle: 'output1',
    animated: true,
    type : "customEdge",
  },
   {
    id: 'e3-4',
    source: '3',
    target: '4',
    targetHandle: 'output2',
    animated: true,
    type : "customEdge",
  },
  
  
];

const Flow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);


  return (
    <div style={{width:"100%",height:"100vh"}} className="bg-slate-200">
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

export default Flow;
