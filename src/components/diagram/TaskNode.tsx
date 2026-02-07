import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeToolTip } from './CustomNodeToolTip';

function TaskNode({ data }) {
  const inputs = data.inputs;
  const outputs = data.outputs;
  const op = data.op;

  const inputSpacing = 100 / (inputs.length + 1);
  const outputSpacing = 100 / (outputs.length + 1);
  const outputClassName = "!w-3 !h-3 !bg-primary !border-2 !bg-white !border-blue-800  !rounded-md";
  const inputClassName = "!w-3 !h-3 !rounded-full !border-2 !bg-white !border-green-800 !rounded-md  !rounded-md";

  function getPosInput(index) {
    return inputSpacing * (index + 1) + "%"
  }

  function getPosInputForTooltip(index) {
    return inputSpacing * index 
  }
  function getPosOutputForTooltip(index) {
    return inputSpacing * index 
  }

  function getPosOutput(index) {
    return outputSpacing * (index + 1) + "%"
  }

  function getInputBoxDiv() {
     let maxLengthOfInputs = 0;
     inputs.map((input) => {
       if(input.length > maxLengthOfInputs)
          maxLengthOfInputs = input.length
     });
    
     switch (true) {
                case (maxLengthOfInputs <= 8):
                    return "border-2 border-green-600 rounded-md -translate-x-1 h-20 w-12"
                case  (maxLengthOfInputs > 8 &&  maxLengthOfInputs <= 16):
                    return "border-2 border-green-600 rounded-md h-20 w-20"
                default:
                     return "border-2 border-green-600 rounded-md  h-20 w-28"
            }
  }
 function getOutputBoxDiv() {
     let maxLengthOfInputs = 0;
     outputs.map((output) => {
       if(output.length > maxLengthOfInputs)
          maxLengthOfInputs = output.length
     });
     
     switch (true) {
                case (maxLengthOfInputs <= 8):
                    return "border-2 border-blue-600 rounded-md translate-x-1 h-20 w-12"
                case  (maxLengthOfInputs > 8 &&  maxLengthOfInputs <= 16):
                    return "border-2 border-blue-600 rounded-md translate-x-1 h-20 w-20"
                default:
                     return "border-2 border-blue-600 rounded-md translate-x-1 h-20 w-28"
            }
  }
  return (

    <div className="border-2 border-slate-400 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-600/50 rounded-md h-32 w-54 hover:border-primary ">
      <div className=' w-full flex flex-row items-center justify-center -translate-y-4'>
                 <CustomNodeToolTip  posTop={0} toolTip={data.nodeLabel} position={Position.Top}
                     handle={<span className="border border-2 border-amber-600 bg-amber-800 dark:bg-slate-600 text-[9px] text-white rounded-md p-1 text-center">{data.nodeLabel}</span>}
                 />
      </div>
      <div className="flex flex-row items-center justify-between">
        <div className={getInputBoxDiv()}>
          
          <Handle
              type="target"
              position={Position.Left}
              id="taskinput"
              className="!w-3 !h-3 !rounded-full !border-2 !bg-green-800 !border-green-800 !rounded-md !top-1"
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
                        {input.length < 20 ? 
                                 (<div className="text-[9px] text-black dark:text-white w-[5rem] flex flex-row pl-3 ">{input}</div>) : 
                                 (<div className="text-[9px] text-black dark:text-white w-[5rem] flex flex-row pl-3">{input.substring(0,18)+".."}</div>)
                        }
                  </Handle>}/>
             
          ))}

        </div>
        <div className={getOutputBoxDiv()}>
            
               <Handle
                  type="source"
                  position={Position.Right}
                  id="taskoutput"
                  className="!w-3 !h-3 !rounded-full !border-2 !bg-blue-600 !border-blue-600 !rounded-md !top-1"
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
                  {output.length <20 ? 
                     (<div className="text-[9px] text-black  dark:text-white  w-[5rem] -translate-x-20 flex flex-row-reverse pr-1 ">{output}</div>) :
                     (<div className="text-[9px] text-black  dark:text-white  w-[5rem]  -translate-x-20 flex flex-row-reverse pr-1 ">{output.substring(0,18)+".."}</div>)
                  }
                </Handle>
                                }/>
           
          ))}
        </div>
      </div>

    </div>
  );
}

export default memo(TaskNode);
