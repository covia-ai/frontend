import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { CustomNodeToolTip } from './CustomNodeToolTip';
function OutputNode({ data }) {
  const outputs = data.outputs;
  const outputSpacing = 100 / (outputs.length + 1);
  const width = 6;
  const height = 4 * (outputs.length)
  const outputClassName = "!w-3 !h-3 !rounded-full !border-2 !bg-white !border-purple-400 !rounded-md"
  const topDivClass = "inline-block border-2 border-slate-400 shadow-md bg-blue-200 rounded-md flex flex-col justify-start items-center min-w-16 min-h-16 hover:border-primary";
  const active = false;

  function getPosOutput(index) {
    return outputSpacing * (index + 1) + "%"
  }
 function getPosOutputForToolTip(index) {
    return outputSpacing * index ;
  }

  return (

    <div style={{ height: height + "rem", width: width + "rem" }} className={topDivClass}>
      {active && <span className="relative flex flex-row-reverse w-full size-3 -translate-x-2 -translate-y-2">
        <span className="absolute inline-flex  h-4 w-4 animate-ping rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex size-3 rounded-full bg-green-500"></span>
      </span>
      }
      <Handle
        type="target"
        position={Position.Left}
        id={"output"}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400 !rounded-md !top-1"
      >
      </Handle>
      {outputs.map((output, index) => (
           <CustomNodeToolTip key={index} posTop={getPosOutputForToolTip(index)} toolTip={output} position={Position.Left}
                    handle={<Handle
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
                     {output.length <20 ? 
                     (<div className="text-[9px] text-black  !text-black  w-[5rem]  flex flex-row pl-3 ">{output}</div>) :
                     (<div className="text-[9px] text-black  !text-black  w-[5rem]  flex flex-row pl-3 ">{output.substring(0,18)+".."}</div>)
                     }
                     </Handle>}
          />

      ))}
    </div>
  );
}

export default memo(OutputNode);
