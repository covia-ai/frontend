import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { CustomNodeToolTip } from './CustomNodeToolTip';

function TaskNode({ data }) {
  const inputs = data.inputs;
  const outputs = data.outputs;
  const op = data.op;

  const inputSpacing = 100 / (inputs.length + 1);
  const outputSpacing = 100 / (outputs.length + 1);
  const outputClassName = "!w-3 !h-3 !bg-primary !border-2 !bg-white !border-purple-400  !rounded-md";
  const inputClassName = "!w-3 !h-3 !rounded-full !border-2 !bg-white !border-purple-400 !rounded-md  !rounded-md";
  const active = false;

  function getPosInput(index) {
    return inputSpacing * (index + 1) + "%"
  }

  function getPosInputForTooltip(index) {
    console.log(inputSpacing * index)
    return inputSpacing * index 
  }
  function getPosOutputForTooltip(index) {
    console.log(inputSpacing * index)
    return inputSpacing * index 
  }

  function getPosOutput(index) {
    return outputSpacing * (index + 1) + "%"
  }


  return (

    <div className="border-2 border-slate-400 shadow-md bg-muted rounded-md h-32 w-48 hover:border-primary ">
      {active && <span class="relative flex flex-row w-full size-3 -translate-x-2 -translate-y-2">
        <span class="absolute inline-flex  h-4 w-4 animate-ping rounded-full bg-green-400 opacity-75"></span>
        <span class="relative inline-flex size-3 rounded-full bg-green-500"></span>
      </span>
      }

      
      <div className=' w-full flex flex-row items-center justify-center -translate-y-4'>
                 <CustomNodeToolTip  posTop={0} toolTip={data.nodeLabel} position={Position.Top}
                     handle={<span className="border border-2 border-slate-400 bg-slate-600 text-white rounded-md p-1 text-xs text-center">{data.nodeLabel}</span>}
                 />
      </div>
      <div className="flex flex-row items-center justify-between">
        <div className="bg-yellow-200  border-2 border-slate-400 rounded-md h-15 w-20 -translate-x-2">
          
          <Handle
              type="target"
              position={Position.Left}
              id="taskinput"
              className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400 !rounded-md !top-1"
            >
            </Handle>
                 
          {inputs.map((input, index) => (
            <CustomNodeToolTip key={index} posTop={getPosInputForTooltip(index)} toolTip={input} position={Position.Left}
                handle={
                  <Handle
                        type="target"
                        key={input}
                        position={Position.Left}
                        style={{
                          top: getPosInput(index),
                          position: 'absolute',
                        }}
                        className={inputClassName}
                        id={input}
                      >
                        <div className="text-xs ml-3">{input}</div>
                  </Handle>}/>
             
          ))}

        </div>
        <div className="bg-blue-200  border-2 border-slate-400 rounded-md h-15 w-20 translate-x-2">
            
               <Handle
                  type="source"
                  position={Position.Right}
                  id="taskoutput"
                  className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400 !rounded-md !top-1"
                >
                </Handle>
          
          {outputs.map((output, index) => (
            <CustomNodeToolTip key={index}  posTop={getPosOutputForTooltip(index)} toolTip={output} position={Position.Right}
                                handle={
                <Handle
                    type="source"
                    key={output}
                    position={Position.Right}
                    id={output}
                    style={{
                      top: getPosOutput(index),
                      position: 'absolute',
                    }}
                    className={outputClassName}

                >
              <div className="text-xs ml-2 -translate-x-12">{output}</div>
                </Handle>
                                }/>
           
          ))}
        </div>
      </div>

    </div>
  );
}

export default memo(TaskNode);
