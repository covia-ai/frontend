import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GiProcessor } from 'react-icons/gi';
import { LabeledHandle } from '../labeled-handle';

function TaskNode({ data }) {
  const inputs = data.inputs;
  const outputs = data.outputs;

  function getOutputClassName(index) {
    return "w-2 h-4 bg-blue-400   rounded-md top-"+(10*(index+1))
  }
  function getInputClassName(index) {
    return "w-2 h-4 bg-pink-400   rounded-md top-"+(10*(index+1))
  }
  function getTargetId(index) {
    return data.nodelabel+"_t"+(index+1);
  }
   function getSourceId(index) {
    return data.nodelabel+"_s"+(index+1);
  }

  return (
      <div className="h-32 w-48">
      
      <div className="shadow-md  border-2 border-slate-400 rounded-md h-32 w-48 bg-slate-600 ">
         
         
           {inputs.map((input,index) => (
            <LabeledHandle
              id={getSourceId(index)}
              title={getTargetId(index)}
              type="target"
              position={Position.Left}
              handleClassName='!w-2! h-2 !bg-teal-500'
              labelClassName='text-white px-2'
            >
          </LabeledHandle>
           ))}
     
          
          {outputs.map((output,index) => (
              <LabeledHandle
                  id={getTargetId(index)}
                  title={output}
                  type="source"
                  position={Position.Right}
                  handleClassName='!w-2! h-2 !bg-red-500'
                  labelClassName='text-white  px-2'
                >
              </LabeledHandle>
         ))}
      </div>
        <div className='text-xs text-black text-center mt-2'>{data.nodelabel}</div>
      </div>
  );
}

export default memo(TaskNode);
