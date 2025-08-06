import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { Position } from '@xyflow/react';

export const CustomNodeToolTip = ( {posTop, toolTip, handle, position} ) => {
    return (<NodeTooltip>
            <NodeTooltipContent position={position} className="text-center text-xs" 
            style={{
                        top:posTop,
                        position: 'absolute',
                    }}
                    >
            {toolTip}
            </NodeTooltipContent>
            <NodeTooltipTrigger>      
                  {handle}
            </NodeTooltipTrigger>
    </NodeTooltip>
    )
}