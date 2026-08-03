"use client";

import { GripVertical } from "lucide-react";
import { TopBar } from "@/components/admin-panel/TopBar";
import { AgentChatPanel } from "@/components/agent-explorer/AgentChatPanel";
import { AgentListPanel } from "@/components/agent-explorer/AgentListPanel";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";
import { usePaneResize } from "@/hooks/use-pane-resize";

type AgentExplorerProps = {
  agentId?: string;
};

export default function AgentExplorer({ agentId }: AgentExplorerProps) {
  const controller = useAgentExplorer(agentId);
  const { width, containerRef, startResizing } = usePaneResize(200);

  return (
    <>
      <TopBar />
      <div
        ref={containerRef}
        className="flex h-[calc(100vh-120px)] min-h-[600px] w-full border border-border rounded-lg overflow-hidden shadow-sm"
      >
        <AgentListPanel
          agents={controller.agentList}
          loading={controller.loading}
          selectedAgentId={controller.selectedAgentId}
          width={width}
          onSelect={controller.setSelectedAgentId}
        />

        <div
          data-testid="agent-list-divider"
          onMouseDown={startResizing}
          className="w-1.5 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
        >
          <div className="hidden group-hover:block absolute bg-blue-500 rounded-full p-0.5">
            <GripVertical size={10} className="text-white" />
          </div>
        </div>

        <AgentChatPanel controller={controller} />
      </div>
    </>
  );
}
