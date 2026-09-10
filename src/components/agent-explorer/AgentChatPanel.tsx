"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  Bot,
  Eye,
  GitFork,
  History,
  Loader2,
  Pause,
  Play,
  Settings,
} from "lucide-react";
import { AgentStatus } from "@covia/covia-sdk";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { AgentChatSurface } from "@/components/agent-explorer/AgentChatSurface";
import { AgentSettings } from "@/components/agent-config/AgentSettings";
import { AgentTimelineView } from "@/components/agent-explorer/AgentTimelineView";
import { AgentContextView } from "@/components/agent-explorer/AgentContextView";
import { AgentRuntimeSummary } from "@/components/agent-explorer/AgentRuntimeSummary";
import { ForkAgentDialog } from "@/components/agent-explorer/ForkAgentDialog";
import { DeleteAgentDialog } from "@/components/agent-explorer/DeleteAgentDialog";
import { SchedulePickerDialog } from "@/components/SchedulePickerDialog";
import type { AgentExplorerController } from "@/hooks/use-agent-explorer";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAgentForkProvenance } from "@/hooks/use-agent-fork-provenance";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { cn } from "@/lib/utils";

export function AgentChatPanel({
  controller,
}: {
  controller: AgentExplorerController;
}) {
  const {
    selectedAgentId,
    selectedAgentDetail,
    detailLoading,
    detailError,
    sessions,
    selectedSessionId,
    suspend,
    resume,
    triggerAgent,
    triggering,
    forkAgent,
    forking,
    deleteAgent,
    updateAgentConfig,
  } = controller;
  const venue = useAuthenticatedVenue();
  const forkedFrom = useAgentForkProvenance((s) =>
    venue && selectedAgentDetail
      ? s.forkedFromOf(venue.venueId, selectedAgentDetail.agentId)
      : null,
  );

  const [view, setView] = useState<"chat" | "timeline" | "settings" | "context">("chat");

  useEffect(() => {
    // Timeline/settings are scoped to the selected agent. A switch must not
    // leave the next agent showing the previous agent's secondary view.
    setView("chat");
  }, [selectedAgentId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {detailLoading && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {!detailLoading && !selectedAgentDetail && (
        <div
          data-testid={detailError ? "agent-detail-error" : "agent-detail-empty"}
          className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center"
        >
          <Bot size={32} />
          <p className="text-sm mt-2">
            {detailError
              ? `Couldn't load details for ${
                  selectedAgentId ?? "this agent"
                } — see the error notification.`
              : "Select an agent"}
          </p>
        </div>
      )}

      {!detailLoading && selectedAgentDetail && (
        <>
          <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <Bot
              size={20}
              className={
                selectedAgentDetail.agentId === DEFAULT_AGENT_ID
                  ? "text-primary dark:text-violet-300"
                  : "text-blue-600 dark:text-blue-400"
              }
            />
            <h3
              className={`text-lg font-bold font-mono ${
                selectedAgentDetail.agentId === DEFAULT_AGENT_ID
                  ? "text-primary dark:text-violet-300"
                  : "text-foreground"
              }`}
            >
              {selectedAgentDetail.agentId}
            </h3>
            <StatusBadge status={selectedAgentDetail.status} kind="agent" as="pill" />
            {forkedFrom && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid="agent-forked-from"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => forkedFrom && controller.setSelectedAgentId(forkedFrom)}
                  >
                    <GitFork size={12} />
                    forked from {forkedFrom}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Open source agent</TooltipContent>
              </Tooltip>
            )}
            {(selectedAgentDetail.tasks ?? 0) > 0 && (
              <Badge variant="outline">
                {selectedAgentDetail.tasks} task
                {selectedAgentDetail.tasks === 1 ? "" : "s"}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="agent-settings-button"
                  aria-label="Agent settings"
                  aria-pressed={view === "settings"}
                  className={cn(
                    "hover:text-foreground",
                    view === "settings" ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => setView(view === "settings" ? "chat" : "settings")}
                >
                  <Settings size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Agent settings</TooltipContent>
            </Tooltip>
            {(selectedAgentDetail.timeline?.length ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="agent-timeline-info"
                    aria-label="Agent timeline"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setView("timeline")}
                  >
                    <History size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Timeline</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="agent-context-info"
                  aria-label="Agent context"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setView("context")}
                >
                  <Eye size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Context</TooltipContent>
            </Tooltip>
            <div className="ml-auto flex flex-row gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      triggering ||
                      selectedAgentDetail.status === AgentStatus.SUSPENDED ||
                      selectedAgentDetail.status === AgentStatus.TERMINATED
                    }
                  >
                    {triggering ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <BellRing size={14} className="mr-1" />
                    )}
                    Trigger now
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Trigger &quot;{selectedAgentDetail.agentId}&quot; now?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This starts an agent run cycle. It may use configured tools and model credits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={triggerAgent}>Trigger agent</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <SchedulePickerDialog
                venue={venue}
                operation="agent:trigger"
                input={{ agentId: selectedAgentDetail.agentId, force: false, wait: false }}
                triggerLabel="Schedule wake"
                triggerSize="sm"
                triggerClassName="w-auto"
                disabled={
                  !venue ||
                  selectedAgentDetail.status === AgentStatus.SUSPENDED ||
                  selectedAgentDetail.status === AgentStatus.TERMINATED
                }
              />
              <ForkAgentDialog
                sourceAgentId={selectedAgentDetail.agentId}
                forking={forking}
                onFork={forkAgent}
              />
              {(selectedAgentDetail.status === AgentStatus.RUNNING ||
                selectedAgentDetail.status === AgentStatus.SLEEPING) && (
                <Button variant="outline" size="sm" onClick={suspend}>
                  <Pause size={14} className="mr-1" /> Suspend
                </Button>
              )}
              {selectedAgentDetail.status === AgentStatus.SUSPENDED && (
                <Button variant="outline" size="sm" onClick={resume}>
                  <Play size={14} className="mr-1" /> Resume
                </Button>
              )}
              <DeleteAgentDialog
                agentId={selectedAgentDetail.agentId}
                onDelete={deleteAgent}
              />
            </div>
          </div>

          <AgentRuntimeSummary sessions={sessions} />

          {view === "settings" ? (
            <AgentSettings
              key={selectedAgentDetail.agentId}
              agent={selectedAgentDetail}
              onBack={() => setView("chat")}
              onSave={updateAgentConfig}
            />
          ) : view === "timeline" ? (
            <AgentTimelineView
              agentId={selectedAgentDetail.agentId}
              onBack={() => setView("chat")}
            />
          ) : view === "context" ? (
            <AgentContextView
              agentId={selectedAgentDetail.agentId}
              sessions={sessions}
              initialSessionId={selectedSessionId}
              onBack={() => setView("chat")}
            />
          ) : (
            <AgentChatSurface controller={controller} />
          )}
        </>
      )}
    </div>
  );
}
