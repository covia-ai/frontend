"use client";

import type { Venue } from "@covia/covia-sdk";
import { Loader2 } from "lucide-react";
import { useAgentLiveEvents } from "@/hooks/use-agent-live-events";

/**
 * The live run-loop line for a single agent, driven by the per-agent SSE the
 * app already receives (`useAgentLiveEvents`). Mounted only for RUNNING agents
 * so the number of open streams is bounded to the working set, not the whole
 * roster. Renders nothing until the stream reports what the agent is doing.
 */
export function AgentLiveActivity({ venue, agentId }: { venue: Venue | null; agentId: string }) {
  const { activity } = useAgentLiveEvents(venue, agentId);
  if (!activity) return null;

  const text =
    activity.kind === "tool"
      ? `calling ${activity.label ?? "a tool"}`
      : "thinking…";

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-primary" data-testid="agent-live-activity">
      <Loader2 size={12} className="animate-spin" />
      {text}
    </div>
  );
}
