
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

import TaskNode from '@/components/diagram/TaskNode';
import InputNode from '@/components/diagram/InputNode';
import ConstNode from '@/components/diagram/ConstNode';
import CustomEdge from '@/components/diagram/CustomEdge';
import OutputNode from '@/components/diagram/OutputNode';
import { parseOpMetadata } from '@/lib/diagramutils';
import { useCallback } from 'react';
import { redirect } from 'next/navigation';
import { useTheme } from 'next-themes';

const nodeTypes = {
  TaskNode: TaskNode,
  InputNode:InputNode,
  OutputNode:OutputNode,
  ConstNode:ConstNode
  
};
const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge
};

export const DiagramViewer = (props:any) => {
       const parseJson = parseOpMetadata(props.metadata);
       const [nodes, setNodes, onNodesChange] = useNodesState(parseJson[0]);
       const [edges, setEdges, onEdgesChange] = useEdgesState(parseJson[1]);
       const { theme  } = useTheme();

      const defaultViewport = { x: 0, y: 0, zoom: 1.5 };
       return (
        <div className="w-full h-100">
           <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesConnectable={false}
                className="bg-slate-800"
                colorMode={theme || "dark"}
                fitView
                defaultViewport={defaultViewport}
              >
                <Background/>
                <Controls />
              </ReactFlow>
        </div>
      );
    
};

