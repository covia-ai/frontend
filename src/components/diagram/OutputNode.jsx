import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function OutputNode({ data }) {
  const outputs = data.outputs;
  const outputSpacing = 100/(outputs.length+1);
  const width  = 4;
  const height = 4*(outputs.length)
  const outputClassName = "!w-3 !h-3 !rounded-full !border-2 !bg-white !border-purple-400 !rounded-md"
  const topDivClass = "inline-block border-2 border-slate-400 shadow-md bg-blue-200 rounded-md flex flex-col justify-start items-center min-w-16 min-h-16";
  const active = false;

  function getPosOutput(index) {
     return outputSpacing*(index+1)+"%"
  }

  
  return (
      
           <div style={{ height: height+"rem", width: width+"rem" }} className={topDivClass}>
              {active && <span class="relative flex flex-row-reverse w-full size-3 -translate-x-2 -translate-y-2">
                <span class="absolute inline-flex  h-4 w-4 animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex size-3 rounded-full bg-green-500"></span>
            </span>
            }
               <Handle
                     type="source"
                     position={Position.Left}
                     id={"output"}
                     className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400 !rounded-md !top-1"
                     >
                     <div className="text-[10px] ml-6 text-black -translate-x-14 translate-y-2">output</div>
                 </Handle>
                  {outputs.map((output,index) => (
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={output}
                        key={index}
                        style={{
                          top: getPosOutput(index),
                          position: 'absolute',
                        }}
                        className={outputClassName}
                        >
                        <div className="text-[10px] !ml-4 !text-black ">{output}</div>
                    </Handle>
                  
                  ))}
              </div>
  );
}

export default memo(OutputNode);
