import React, { memo } from 'react';
import {Handle,  Position } from '@xyflow/react';
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { CustomNodeToolTip } from './CustomNodeToolTip';

function InputNode({ data }) {
  const inputs = data.inputs;
  const inputSpacing = 100/(inputs.length+1);

  const width  = 6;
  const height = 4*(inputs.length+1)
  const topDivClass ="border-2 border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-600/50 rounded-md flex flex-col justify-start items-center min-w-16 min-h-16";
  const inputClassName = "!w-3 !h-3 !bg-white !border-green-800 !border-2 !rounded-md ";

  function getPosInput(index) {
     return inputSpacing*(index+1)+"%"
  }
   function getPosInputForTooltip(index) {
     return inputSpacing*(index);
  }
  return (
    <>
   
      <div  style={{ height:height+"rem", width: width+"rem" }} className={topDivClass}>
      <div className=' w-full flex flex-row items-center justify-center -translate-y-4'>
        <div className="border w-20 border-2 border-green-500 dark:border-green-600 bg-green-800 dark:bg-slate-600 text-white rounded-md text-[9px] text-center px-1 py-1">{data.nodeLabel}</div>      
      </div>
   <Handle
                type="source"
                position={Position.Right}
                id={"input"}
                key="input"
                className="!w-3 !h-3 !rounded-full !border-2 !bg-green-800 !border-green-800 !rounded-md !top-0 !mt-6">  
          </Handle>
          {inputs.map((input,index) => (
              <CustomNodeToolTip key={index}  posTop={getPosInputForTooltip(index)} toolTip={input} position={Position.Right}
                            handle={
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
                                 {input.length < 20 ? 
                                 (<div className="text-[9px] text-black dark:text-white -translate-x-20   w-[5rem] flex flex-row-reverse pr-1">{input}</div>) : 
                                 (<div className="text-[9px] text-black dark:text-white -translate-x-20   w-[5rem] flex flex-row-reverse pr-1">{input.substring(0,18)+".."}</div>)
                                 }
                            </Handle>
                            }
              />
          ))}
      </div>
      </>
  );
}

export default memo(InputNode);
