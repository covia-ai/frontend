"use client";

import { useMemo, useState } from "react";
import { AlarmClock, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import type { Session } from "@/config/types";
import { messageContentToString } from "@/lib/agent-turns";

type PendingEnvelope = {
  sessionId: string;
  message: unknown;
};

function pendingMessage(envelope: unknown): unknown {
  if (envelope && typeof envelope === "object" && "message" in envelope) {
    return (envelope as { message?: unknown }).message;
  }
  return envelope;
}

function formatWakeTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AgentRuntimeSummary({ sessions }: { sessions: Session[] }) {
  const [expanded, setExpanded] = useState(false);
  const pending = useMemo<PendingEnvelope[]>(
    () => sessions.flatMap((session) =>
      (session.pending ?? []).map((envelope) => ({
        sessionId: session.sessionId,
        message: pendingMessage(envelope),
      })),
    ),
    [sessions],
  );
  const nextWakeTime = useMemo(() => {
    const wakeTimes = sessions
      .map((session) => session.wakeTime)
      .filter((value): value is number => typeof value === "number" && value > 0);
    return wakeTimes.length > 0 ? Math.min(...wakeTimes) : null;
  }, [sessions]);

  if (pending.length === 0 && nextWakeTime === null) return null;

  return (
    <div className="border-b bg-muted/20 px-6 py-2 text-xs" data-testid="agent-runtime-summary">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {pending.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <Inbox size={14} aria-hidden="true" />
            {pending.length} pending message{pending.length === 1 ? "" : "s"}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
        {nextWakeTime !== null && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <AlarmClock size={14} aria-hidden="true" />
            Next wake: {formatWakeTime(nextWakeTime)}
          </span>
        )}
      </div>

      {expanded && pending.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border bg-background p-2">
          {pending.map((item, index) => (
            <li key={`${item.sessionId}-${index}`} className="flex gap-2 rounded px-2 py-1.5">
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                …{item.sessionId.slice(-8)}
              </span>
              <span className="min-w-0 break-words text-foreground">
                {messageContentToString(item.message) || "Queued message"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
