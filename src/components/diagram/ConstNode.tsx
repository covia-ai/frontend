import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";


function ConstNode({ data }) {
  return (

    <div className="rounded-md  border-2 bg-pink-200 border border-slate-600 p-2 hover:border-2 hover:border-primary">
       
                  <Handle
                  type="source"
                  position={Position.Right}
                  id={data.id}
                  className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400  "
                >
                </Handle>
          
                  <NodeTooltip>
                  <NodeTooltipContent position={Position.Top} className="text-center text-xs -translate-y-2">
                    {data.nodeLabel}
                  </NodeTooltipContent>
                     <NodeTooltipTrigger>
                       <div className="text-sm flex items-center text-center text-black">{data.nodeLabel}</div>
                </NodeTooltipTrigger>
                </NodeTooltip>
    </div>
  );
}

export default memo(ConstNode);
