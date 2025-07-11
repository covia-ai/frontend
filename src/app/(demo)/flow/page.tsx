import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

  function MyFlowComponent() {
      // Define your nodes and edges here
      const initialNodes = [
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
        { id: '2', position: { x: 100, y: 100 }, data: { label: 'Node 2' } },
      ];
      const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <ReactFlow nodes={initialNodes} edges={initialEdges} />
        </div>
      );
    }

    export default MyFlowComponent;