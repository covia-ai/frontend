import { Bot, Loader2 } from "lucide-react";
import type { AgentListItem } from "@/config/types";
import { StatusBadge } from "@/components/StatusBadge";

type AgentListPanelProps = {
  agents: AgentListItem[];
  loading: boolean;
  selectedAgentId: string | null;
  width: number;
  onSelect: (agentId: string) => void;
};

export function AgentListPanel({
  agents,
  loading,
  selectedAgentId,
  width,
  onSelect,
}: AgentListPanelProps) {
  return (
    <div
      data-testid="agent-list-panel"
      style={{ width: `${width}px` }}
      className="flex-shrink-0 border-r border-border overflow-y-auto"
    >
      <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Agents
      </div>
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}
      {agents.map((agent) => {
        const selected = selectedAgentId === agent.agentId;
        return (
          <button
            key={agent.agentId}
            onClick={() => onSelect(agent.agentId)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-b border-border last:border-0 ${
              selected
                ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Bot
              size={14}
              className={`flex-shrink-0 ${
                selected
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-base truncate">{agent.agentId}</p>
              {(agent.tasks != null || agent.status) && (
                <div className="flex items-center gap-1.5 text-[10px] opacity-70">
                  {agent.tasks != null && (
                    <span>
                      {agent.tasks} task{agent.tasks !== 1 ? "s" : ""}
                    </span>
                  )}
                  {agent.tasks != null && agent.status && <span>·</span>}
                  {agent.status && (
                    <StatusBadge
                      status={agent.status}
                      kind="agent"
                      as="pill"
                    />
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
      {!loading && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Bot size={32} />
          <p className="text-sm mt-2">No agents found</p>
        </div>
      )}
    </div>
  );
}
