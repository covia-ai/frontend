import React, { type FC } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
 import { useTheme } from 'next-themes';
 
const CustomEdge: FC<EdgeProps<Edge<{ startLabel: string; color: string }>>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const { theme  } = useTheme();
  return (
    <>
      {theme == "dark" && <BaseEdge id={id} path={edgePath} style={{ stroke: 'lightgray', strokeWidth: 2 }} />}
      {theme == "light" && <BaseEdge id={id} path={edgePath} style={{ stroke: 'darkgray', strokeWidth: 2 }} />}
      <EdgeLabelRenderer>
        {data?.startLabel && <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="edge-label-renderer__custom-edge nodrag nopan text-xs text-red-400 w-fit rounded-md p-1 mt-1"
        >
          {data?.startLabel}
        </div>
         }
         
         
      </EdgeLabelRenderer>
    </>
  );
};
 
export default CustomEdge;