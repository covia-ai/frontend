import React, { memo } from 'react';
import {Handle,  Position } from '@xyflow/react';

function InputNode({ data }) {
  const inputs = data.inputs;
  const inputSpacing = 100/(inputs.length+1);

  const width  = 4;
  const height = 4*(inputs.length+1)
  const topDivClass ="inline-block border-2 border-slate-400 shadow-md bg-yellow-200 rounded-md flex flex-col justify-start items-center min-w-16 min-h-16 ";
  const inputClassName = "!w-3 !h-3 !bg-white !border-purple-400 !border-2 !rounded-md ";

  const active = false;
  function getPosInput(index) {
     return inputSpacing*(index+1)+"%"
  }
  
  return (
     
      <div  style={{ height:height+"rem", width: width+"rem" }} className={topDivClass}>
          
          
          {active && <span class="relative flex flex-row w-full size-3 -translate-x-2 -translate-y-2">
            <span class="absolute inline-flex  h-4 w-4 animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex size-3 rounded-full bg-green-500"></span>
         </span>
         }
          <Handle
                type="source"
                position={Position.Right}
                id={"input"}
                key="input"
                className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400 !rounded-md !top-1"
                >  
                <div className="text-[10px] ml-6 text-black -translate-x-14 translate-y-2">input</div>
          </Handle>
          {inputs.map((input,index) => (
            <Handle
                type="source"
                position={Position.Right}
                id={input}
                key={input}
                style={{
                          top: getPosInput(index),
                          position: 'absolute',
                }}
                className={inputClassName}
                >
                <div className="text-[10px] ml-6 text-black -translate-x-14  ">{input}</div>
            </Handle>
          
          ))}
      </div>
  );
}

export default memo(InputNode);
