import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { LabeledHandle } from '../labeled-handle';

function OutputNode({ data }) {
  const outputs = data.outputs;
  function getOutputClassName(index) {
    return "w-2 h-4 bg-pink-400   rounded-md top-"+(10*(index+1))
  }
  function getTargetId(index) {
    return "output"+(index+1);
  }
  return (
      <div> 
      <div className="shadow-md  border-2 border-slate-400 rounded-md h-64 w-24 bg-slate-600 "> 
          {outputs.map((output,index) => (
            <LabeledHandle
                id={getTargetId(index)}
                title={output}
                type="target"
                position={Position.Left}
                handleClassName='!w-2! h-2 !bg-teal-500'
                labelClassName='text-white  px-2'
              >
            </LabeledHandle>
          
          ))}
      </div>
        <div className='text-xs text-black text-center mt-2'>{data.nodelabel}</div>
      </div>
  );
}

export default memo(OutputNode);
