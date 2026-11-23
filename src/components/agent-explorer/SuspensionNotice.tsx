"use client";

import { Pause } from "lucide-react";
import { DidDisplay } from "@/components/DidDisplay";
import type { AgentSuspension } from "@/lib/agent-suspension";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";

/**
 * Who stopped a deliberately suspended agent, when, and why (covia#590):
 * "Suspended by you · 3m ago — rotating its key". `self` is the signed-in
 * account's DID, so a stop of your own reads as "you" rather than as a DID.
 */
export function SuspensionNotice({
  suspension,
  self,
  className,
}: {
  suspension: AgentSuspension;
  self?: string | null;
  className?: string;
}) {
  const { by, ts, reason } = suspension;
  return (
    <div
      data-testid="agent-suspension"
      className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground", className)}
    >
      <Pause size={12} className="shrink-0" />
      <span>Suspended by</span>
      {by === self ? <span>you</span> : <DidDisplay value={by} chars={10} />}
      {ts !== undefined && (
        <span data-testid="agent-suspension-time" title={formatDateTime(ts)}>
          · {formatRelativeTime(ts)}
        </span>
      )}
      {reason && (
        <span data-testid="agent-suspension-reason" className="min-w-0 break-words text-foreground">
          — {reason}
        </span>
      )}
    </div>
  );
}
