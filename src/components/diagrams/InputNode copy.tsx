import React, { memo } from 'react';
import {Handle,  Position } from '@xyflow/react';
import { LabeledHandle } from "@/components/labeled-handle";

function InputNode({ data }) {
  const inputs = data.inputs;
  function getInputClassName(index) {
    return "w-2 h-4 bg-blue-400   rounded-md absolute top-"+(10*(index+1))
  }
  function getSourceId(index) {
    return "input"+(index+1);
  }
  return (
      <div>   
      <div className="shadow-md  border-2 border-slate-400 rounded-md h-64 w-24 bg-slate-600 ">
          
            {inputs.map((input,index) =>
            
            (<LabeledHandle
                id={getSourceId(index)}
                title={getSourceId(index)}
                type="source"
                position={Position.Right}
                handleClassName='!w-2 !h-2 !bg-teal-500 '
                labelClassName='text-white  px-2'
              />
            ))}     
      </div>
        <div className='text-xs text-black text-center mt-2'>{data.nodelabel}</div>
      </div>
  );
}

export default memo(InputNode);
