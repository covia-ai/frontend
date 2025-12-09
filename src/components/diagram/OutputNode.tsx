import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeToolTip } from './CustomNodeToolTip';
function OutputNode({ data }) {
  const outputs = data.outputs;
  const outputSpacing = 100 / (outputs.length + 1);
  const width = 6;
  const height = 4 * (outputs.length)
  const outputClassName = "!w-3 !h-3 !rounded-full !border-2 !bg-white !border-blue-600 !rounded-md"
  const topDivClass ="border-2 border-slate-400 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-600/50 rounded-md flex flex-col justify-start items-center min-w-16 min-h-16";

  function getPosOutput(index) {
    return outputSpacing * (index + 1) + "%"
  }
 function getPosOutputForToolTip(index) {
    return outputSpacing * index ;
  }

  return (

    <div style={{ height: height + "rem", width: width + "rem" }} className={topDivClass}>
     <div className=' w-full flex flex-row items-center justify-center -translate-y-4'>
        <div className="border w-20 border-2 border-blue-500 bg-blue-800 dark:bg-slate-600 text-white rounded-md text-[9px] text-center px-1 py-1">{data.nodeLabel}</div>      
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id={"output"}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-blue-700 !border-blue-700 !rounded-md !top-1 !mt-6"
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
                     (<div className="text-[9px] text-black dark:text-white w-[5rem] flex flex-row pl-3 ">{output}</div>) :
                     (<div className="text-[9px] text-black dark:text-white -[5rem]  flex flex-row pl-3 ">{output.substring(0,18)+".."}</div>)
                     }
                     </Handle>}
          />

      ))}
    </div>
  );
}

export default memo(OutputNode);
