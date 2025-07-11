import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

function TaskNode({data}) {
  console.log(data)
  return (
      <div className="">

      <div className="w-32 h-12 shadow-md  bg-slate-600  text-white border-2 border-slate-400 rounded-md  flex flex-col items-center justify-center ">
           <div className=" text-white">           
               {data.label}
          </div>
         
          <Handle
            type="target"
            position={Position.Top}
            className=""
            >
              <div className="handle_input_text text-xs text-red-400 -translate-6">{data.inputLabel[0]}</div>
          </Handle>
          
          
          <Handle
          type="source"
          position={Position.Bottom}
          className="w-4 h-4 bg-blue-400   rounded-md "
          >
          <div className="text-xs text-blue-400 translate-2">{data.outputLabel[0]}</div>
          </Handle>
         
      </div>
      </div>
  );
}

export default memo(TaskNode);
