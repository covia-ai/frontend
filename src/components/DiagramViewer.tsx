
'use client'

import { Background, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TaskNode from './TaskNode'

export const DiagramViewer = (props:any) => {
      
     const nodeTypes = {
      taskNode: TaskNode,
      };
      console.log(props.diagramData)
      return (
        <div style={{ width: '100%', height: '500px' }}>
           
          {JSON.stringify(props.diagramData)}
          <ReactFlow nodes={props.diagramData} nodeTypes={nodeTypes} >
            <Background/>
          </ReactFlow>
        </div>
      );
    
};

