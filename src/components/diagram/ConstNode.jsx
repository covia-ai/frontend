import React, { memo } from 'react';
import {Handle,  Position } from '@xyflow/react';

function ConstNode({ data }) {
  console.log(data)
  return (
     
      <div className="w-8 h-8 rounded-full bg-pink-200 border border-slate-600">
          
          
         
          <Handle
                type="source"
                position={Position.Top}
                id="const"
                className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400 !rounded-md !top-1"
                >  
                <div className="text-[14px] ml-3 text-black ">{data.nodeLabel}</div>
          </Handle>
          
      </div>
  );
}

export default memo(ConstNode);
