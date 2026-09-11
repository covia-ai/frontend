"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();

  // On the drill-in route the URL names the agent, and the breadcrumb reads
  // the agent from it. Picking a different agent in the left panel therefore
  // has to move the URL too, or the crumb — and any link the user copies —
  // keeps naming the agent they arrived at. Other mounts of this component
  // have no agent in their path and just change the selection.
  const { setSelectedAgentId } = controller;
  const handleSelect = useCallback(
    (nextAgentId: string) => {
      setSelectedAgentId(nextAgentId);
      if (pathname?.startsWith("/agents/agent/")) {
        router.replace(`/agents/agent/${encodeURIComponent(nextAgentId)}`);
      }
    },
    [pathname, router, setSelectedAgentId],
  );

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
          onSelect={handleSelect}
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
