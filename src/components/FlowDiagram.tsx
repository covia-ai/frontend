'use client'

import { ReactFlow, useNodesState, useEdgesState, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export const FlowDiagram = () => {
  const initialNodes = [
    { id: '1', type: 'input', data: { label: 'Scrap Website' }, position: { x: 250, y: 50 } },
    { id: '2', data: { label: 'Summarize' }, position: { x: 350, y: 150 } },
    { id: '3', data: { label: 'Summary of website' }, position: { x: 450, y: 250 } },
  ];

  const initialEdges = [{ id: 'edge-1-2', source: '1', target: '2' }, { id: 'edge-2-3', source: '2', target: '3' }];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (params: any) => setEdges((eds) => eds.concat(params));

  return (
    <div className="w-full h-96 border border-slate-200 shadow-md rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={true}
        nodesConnectable={false}

        fitView
      >
        <Background></Background>
        <Controls></Controls>
      </ReactFlow>
    </div>
  );
};
