
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
      
        const onNodeClick = useCallback(
            (event: React.MouseEvent, node: Node) => {
              redirect("https://venue-test.covia.ai/venues/default/operations/"+node.op);
            },
            []
          );
          
       return (
        <div style={{ width: '80%', height: '500px' , border: '1px solid #ccc'}}>
           <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesConnectable={false}
                className="bg-slate-800"
                onNodeClick={onNodeClick}
                fitView
              >
                <Background/>
                <Controls />
              </ReactFlow>
        </div>
      );
    
};

