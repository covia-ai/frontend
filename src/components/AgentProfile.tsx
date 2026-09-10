"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentStatus } from "@covia/covia-sdk";
import { BellRing, Cpu, GitFork, Loader2, Pause, Play, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/admin-panel/TopBar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { DidDisplay } from "@/components/DidDisplay";
import { AgentIdenticon } from "@/components/agent-roster/AgentIdenticon";
import { AgentChatSurface } from "@/components/agent-explorer/AgentChatSurface";
import { AgentTimelineView } from "@/components/agent-explorer/AgentTimelineView";
import { AgentContextView } from "@/components/agent-explorer/AgentContextView";
import { AgentSettings } from "@/components/agent-config/AgentSettings";
import { AgentRuntimeSummary } from "@/components/agent-explorer/AgentRuntimeSummary";
import { ForkAgentDialog } from "@/components/agent-explorer/ForkAgentDialog";
import { DeleteAgentDialog } from "@/components/agent-explorer/DeleteAgentDialog";
import { SchedulePickerDialog } from "@/components/SchedulePickerDialog";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";
import { useCurrentAuth } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAgentForkProvenance } from "@/hooks/use-agent-fork-provenance";
import { agentDisplay, humanizeAgentId, shortRefLabel } from "@/lib/agent-display";

/**
 * The agent drill-in as a profile (Direction C): a clean identity header with
 * the agent's make-up and actions, then tabs over the existing, tested views —
 * the workforce roster is the switcher, so this is single-column and focused on
 * one agent. Reuses useAgentExplorer for data + actions and the extracted view
 * components; nothing is a rewrite.
 */
export function AgentProfile({ agentId }: { agentId: string }) {
  const controller = useAgentExplorer(agentId);
  const {
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
  const ownerDid = useCurrentAuth()?.did ?? null;
  const router = useRouter();
  const forkedFrom = useAgentForkProvenance((s) =>
    venue && selectedAgentDetail ? s.forkedFromOf(venue.venueId, selectedAgentDetail.agentId) : null,
  );
  const [tab, setTab] = useState("conversations");

  const agent = selectedAgentDetail;
  const display = agent ? agentDisplay(agent.config) : null;
  const status = agent?.status;
  const canSuspend = status === AgentStatus.RUNNING || status === AgentStatus.SLEEPING;

  return (
    <div className="flex h-full flex-col">
      <TopBar assetOrJobName={agent ? humanizeAgentId(agent.agentId) : undefined} />

      {detailLoading && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {!detailLoading && !agent && (
        <div
          data-testid={detailError ? "agent-detail-error" : "agent-detail-empty"}
          className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground"
        >
          <p className="text-sm">
            {detailError
              ? `Couldn't load ${agentId} — see the error notification.`
              : `Agent ${agentId} was not found.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/agents")}>
            Back to agents
          </Button>
        </div>
      )}

      {!detailLoading && agent && display && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-4">
          {/* Identity */}
          <div className="flex flex-wrap items-start gap-4 rounded-lg border bg-card p-4">
            <AgentIdenticon agentId={agent.agentId} className="size-14" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold leading-tight">{humanizeAgentId(agent.agentId)}</h1>
                <StatusBadge status={agent.status} kind="agent" as="pill" />
                {(agent.tasks ?? 0) > 0 && (
                  <Badge variant="outline">
                    {agent.tasks} task{agent.tasks === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">{agent.agentId}</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Cpu size={11} /> {display.model || display.providerLabel}
                </span>
                {display.skills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {shortRefLabel(s)}
                  </span>
                ))}
                {display.hasCaps && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                        <ShieldCheck size={11} /> governed
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Acts under an explicit capability grant</TooltipContent>
                  </Tooltip>
                )}
                {forkedFrom && (
                  <button
                    type="button"
                    data-testid="agent-forked-from"
                    onClick={() => router.push(`/agents/agent/${encodeURIComponent(forkedFrom)}`)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <GitFork size={11} /> forked from {forkedFrom}
                  </button>
                )}
              </div>
              {ownerDid && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  acts as <DidDisplay value={ownerDid} identicon chars={10} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={triggering || status === AgentStatus.SUSPENDED || status === AgentStatus.TERMINATED}
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
                    <AlertDialogTitle>Trigger &quot;{agent.agentId}&quot; now?</AlertDialogTitle>
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
                input={{ agentId: agent.agentId, force: false, wait: false }}
                triggerLabel="Schedule wake"
                triggerSize="sm"
                triggerClassName="w-auto"
                disabled={!venue || status === AgentStatus.SUSPENDED || status === AgentStatus.TERMINATED}
              />
              <ForkAgentDialog sourceAgentId={agent.agentId} forking={forking} onFork={forkAgent} />
              {canSuspend && (
                <Button variant="outline" size="sm" onClick={suspend}>
                  <Pause size={14} className="mr-1" /> Suspend
                </Button>
              )}
              {status === AgentStatus.SUSPENDED && (
                <Button variant="outline" size="sm" onClick={resume}>
                  <Play size={14} className="mr-1" /> Resume
                </Button>
              )}
              <DeleteAgentDialog
                agentId={agent.agentId}
                onDelete={(remove) => {
                  deleteAgent(remove);
                  router.push("/agents");
                }}
              />
            </div>
          </div>

          <AgentRuntimeSummary sessions={sessions} />

          <Tabs value={tab} onValueChange={setTab} className="flex w-full flex-1 flex-col">
            <TabsList>
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="context">Context</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="mt-3">
              <div className="flex h-[62vh] min-h-[420px] flex-col overflow-hidden rounded-lg border bg-card">
                <AgentChatSurface controller={controller} />
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-3">
              <div className="rounded-lg border bg-card">
                <AgentTimelineView agentId={agent.agentId} />
              </div>
            </TabsContent>
            <TabsContent value="context" className="mt-3">
              <div className="rounded-lg border bg-card">
                <AgentContextView
                  agentId={agent.agentId}
                  sessions={sessions}
                  initialSessionId={selectedSessionId}
                />
              </div>
            </TabsContent>
            <TabsContent value="settings" className="mt-3">
              <div className="rounded-lg border bg-card">
                <AgentSettings key={agent.agentId} agent={agent} onSave={updateAgentConfig} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
