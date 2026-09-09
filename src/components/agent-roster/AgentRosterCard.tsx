"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Venue } from "@covia/covia-sdk";
import {
  ArrowUpRight,
  Cpu,
  MessageSquareText,
  MoreHorizontal,
  Pause,
  Play,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteAgentDialog } from "@/components/agent-explorer/DeleteAgentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { notifyError, notifySuccess } from "@/lib/notify";
import { agentDisplay, humanizeAgentId, shortRefLabel } from "@/lib/agent-display";
import type { RosterAgent } from "@/hooks/use-agent-roster";
import { AgentLiveActivity } from "./AgentLiveActivity";
import { AgentIdenticon } from "./AgentIdenticon";

export function AgentRosterCard({
  agent,
  venue,
  onChanged,
}: {
  agent: RosterAgent;
  venue: Venue;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const { agentId } = agent;
  const name = humanizeAgentId(agentId);
  const status = (agent.status ?? "").toUpperCase();
  const isRunning = status === "RUNNING";
  const isSuspended = status === "SUSPENDED";
  const isTerminated = status === "TERMINATED";
  const { providerLabel, model, brief, skills, tools, hasCaps } = agentDisplay(agent.config);
  const modelLabel = model || providerLabel;

  const handle = venue.agent(agentId);
  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(ok);
      onChanged();
    } catch (err) {
      notifyError(fail, err, venue.baseUrl);
    } finally {
      setBusy(false);
    }
  };

  const goChat = () => router.push(`/agents/chat?agentId=${encodeURIComponent(agentId)}`);
  const goOpen = () => router.push(`/agents/view?agentId=${encodeURIComponent(agentId)}`);

  const visibleSkills = skills.slice(0, 3);
  const hiddenSkills = skills.length - visibleSkills.length;

  return (
    <Card
      className={`group flex h-full flex-col gap-0 overflow-hidden rounded-lg border bg-card p-0 shadow-sm transition-all hover:border-accent hover:shadow-md ${
        isRunning ? "border-primary/40" : ""
      } ${isTerminated ? "opacity-70" : ""}`}
    >
      {/* Identity */}
      <div className="flex items-center gap-3 border-b bg-card-banner px-4 py-3">
        <AgentIdenticon agentId={agentId} />
        <button type="button" onClick={goOpen} className="min-w-0 flex-1 text-left">
          <div className="truncate text-base font-semibold leading-tight text-foreground">{name}</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{agentId}</div>
        </button>
        <StatusBadge status={agent.status} kind="agent" as="pill" />
      </div>

      {/* What it is */}
      <div className="flex flex-1 flex-col gap-2.5 px-4 py-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {brief || "No instructions set."}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Cpu size={11} /> {modelLabel}
          </span>
          {visibleSkills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              {shortRefLabel(s)}
            </span>
          ))}
          {hiddenSkills > 0 && (
            <span className="font-mono text-[11px] text-muted-foreground">+{hiddenSkills}</span>
          )}
          {hasCaps && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                  <ShieldCheck size={11} /> governed
                </span>
              </TooltipTrigger>
              <TooltipContent>Acts under an explicit capability grant</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="mt-auto flex min-h-[18px] items-center gap-3 pt-0.5 text-xs text-muted-foreground">
          {isRunning && <AgentLiveActivity venue={venue} agentId={agentId} />}
          {typeof agent.tasks === "number" && agent.tasks > 0 && (
            <span>
              {agent.tasks} task{agent.tasks === 1 ? "" : "s"}
            </span>
          )}
          {tools.length > 0 && (
            <span>
              {tools.length} tool{tools.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t px-4 py-2.5">
        <button
          type="button"
          data-testid="roster-chat"
          onClick={goChat}
          disabled={isTerminated}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-[filter] hover:brightness-110 disabled:opacity-40"
        >
          <MessageSquareText size={13} /> Chat
        </button>
        <button
          type="button"
          data-testid="roster-open"
          onClick={goOpen}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
        >
          Open <ArrowUpRight size={13} />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="roster-actions"
                disabled={busy}
                className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-40"
                aria-label="Agent actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={isSuspended || isTerminated}
                onClick={() => run(() => handle.trigger(), `Triggered ${name}`, "Unable to trigger agent")}
              >
                <Zap size={14} /> Trigger now
              </DropdownMenuItem>
              {isSuspended ? (
                <DropdownMenuItem
                  onClick={() => run(() => handle.resume(), `Resumed ${name}`, "Unable to resume agent")}
                >
                  <Play size={14} /> Resume
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={isTerminated}
                  onClick={() => run(() => handle.suspend(), `Suspended ${name}`, "Unable to suspend agent")}
                >
                  <Pause size={14} /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={goOpen}>
                <ArrowUpRight size={14} /> Fork, schedule &amp; settings…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteAgentDialog
            agentId={agentId}
            onDelete={(remove) =>
              run(
                () => handle.delete(remove),
                remove ? `Removed ${name}` : `Terminated ${name}`,
                "Unable to delete agent",
              )
            }
          />
        </div>
      </div>
    </Card>
  );
}
