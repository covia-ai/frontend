import type { ReactNode } from "react";
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";

export const CustomNodeToolTip = ( {posTop, toolTip, handle, position}: { posTop?: number | string; toolTip: ReactNode; handle?: ReactNode; position: any } ) => {
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