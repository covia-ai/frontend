import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ConstNode({ data }) {
  console.log(data)
  return (

    <div className="rounded-md bg-pink-200 border border-slate-600 p-2">
      <Handle
        type="source"
        position={Position.Right}
        id={data.id}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-purple-400 !border-purple-400  "
      >
      </Handle>
      <div className="text-sm flex items-center text-center text-black">{data.nodeLabel}</div>
    </div>
  );
}

export default memo(ConstNode);
