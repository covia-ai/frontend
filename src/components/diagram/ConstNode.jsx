import React, { memo } from 'react';
import {Handle,  Position } from '@xyflow/react';

function ConstNode({ data }) {
  console.log(data)
  return (
     
      <div className="w-16 h-16 rounded-full bg-pink-200 border border-slate-600">
          
          
         
          <Handle
                type="source"
                position={Position.Right}
                id={data.id}
                className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400  "
                >  
                <div className="text-[10px] flex items-center text-center text-black -translate-x-14 ">{data.nodeLabel}</div>
          </Handle>
          
      </div>
  );
}

export default memo(ConstNode);
