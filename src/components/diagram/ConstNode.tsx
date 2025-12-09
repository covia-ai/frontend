import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";


function ConstNode({ data }) {
  return (

    <div className="rounded-md  border-2  border-slate-300 dark:border-slate-700 bg-slate-200/50  p-2">
       
                  <Handle
                  type="source"
                  position={Position.Right}
                  id={data.id}
                  className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-500 !border-purple-500  "
                >
                </Handle>
          
                  <NodeTooltip>
                  <NodeTooltipContent position={Position.Top} className="text-center text-xs -translate-y-2">
                    {data.nodeLabel}
                  </NodeTooltipContent>
                     <NodeTooltipTrigger>
                      {data.nodeLabel?.length < 15 && <div className="text-[9px] flex items-center text-center text-black dark:text-white">{data.nodeLabel}</div>}
                      {data.nodeLabel?.length > 15 && <div className="text-[9px] flex items-center text-center text-black dark:text-white">{data.nodeLabel.substring(0,13)+".."}</div>}

                </NodeTooltipTrigger>
                </NodeTooltip>
    </div>
  );
}

export default memo(ConstNode);
