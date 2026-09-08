"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Loader2, MessageSquare, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DidDisplay } from "@/components/DidDisplay";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { notifyError } from "@/lib/notify";

type TimelineMessage = {
  message?: unknown;
  caller?: string;
  sessionId?: string;
  jobId?: string;
};

type TimelineToolFailure = { name?: string; error?: string };

type TimelineEntry = {
  start?: number;
  end?: number;
  op?: string;
  result?: unknown;
  messages?: TimelineMessage[];
  toolFailures?: TimelineToolFailure[];
  tokens?: { input?: number; output?: number; total?: number };
  [key: string]: unknown;
};

function formatTimestamp(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(start?: number, end?: number): string | null {
  if (!start || !end || end < start) return null;
  const ms = end - start;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function resultLooksLikeFailure(result: unknown): boolean {
  return typeof result === "string" && /transition failed|error/i.test(result);
}

function resultText(result: unknown): string {
  if (result == null) return "—";
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

// The extras a timeline entry sometimes carries (tasks, taskResults, ...)
// beyond what this view renders explicitly — shown as a raw fallback rather
// than silently dropped, since the shape is adapter-defined and open-ended.
const KNOWN_KEYS = new Set([
  "start",
  "end",
  "op",
  "result",
  "messages",
  "toolFailures",
  "tokens",
]);

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  const duration = formatDuration(entry.start, entry.end);
  const failed = resultLooksLikeFailure(entry.result);
  const extras = Object.fromEntries(
    Object.entries(entry).filter(([key]) => !KNOWN_KEYS.has(key)),
  );
  const hasExtras = Object.keys(extras).length > 0;

  return (
    <div className="relative pl-10">
      <span
        className={`absolute left-2.5 top-1.5 size-3 rounded-full border-2 border-background ${
          failed ? "bg-red-500" : "bg-primary"
        }`}
      />
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="font-mono text-[11px]">
            {entry.op ?? "unknown op"}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={12} /> {formatTimestamp(entry.start)}
          </span>
          {duration && (
            <Badge variant="secondary" className="text-[11px]">
              {duration}
            </Badge>
          )}
          {entry.tokens?.total != null && (
            <Badge variant="outline" className="text-[11px]">
              {entry.tokens.total} tokens
              {entry.tokens.input != null && entry.tokens.output != null
                ? ` (${entry.tokens.input} in / ${entry.tokens.output} out)`
                : ""}
            </Badge>
          )}
          {failed && (
            <Badge variant="destructive" className="text-[11px] gap-1">
              <TriangleAlert size={11} /> Failed
            </Badge>
          )}
        </div>

        {entry.messages && entry.messages.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {entry.messages.map((msg, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs bg-muted/50 rounded px-2 py-1.5"
              >
                <MessageSquare size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words">
                    {typeof msg.message === "string"
                      ? msg.message
                      : JSON.stringify(msg.message)}
                  </p>
                  {msg.caller && (
                    <div className="mt-1">
                      <DidDisplay value={msg.caller} chars={8} iconSize={12} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Result
          </div>
          <p
            className={`text-xs whitespace-pre-wrap break-words ${
              failed ? "text-red-500 dark:text-red-400" : ""
            }`}
          >
            {resultText(entry.result)}
          </p>
        </div>

        {entry.toolFailures && entry.toolFailures.length > 0 && (
          <div className="mt-3 space-y-1">
            {entry.toolFailures.map((tf, i) => (
              <div
                key={i}
                className="text-xs text-red-500 dark:text-red-400 flex items-start gap-1"
              >
                <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">{tf.name ?? "tool"}:</span>{" "}
                  {tf.error}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasExtras && (
          <details className="mt-3">
            <summary className="text-[11px] text-muted-foreground cursor-pointer select-none">
              Raw details
            </summary>
            <pre className="font-mono text-[11px] bg-muted rounded px-2 py-2 mt-1 overflow-x-auto">
              {JSON.stringify(extras, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Inline replacement for the chat area (session picker + transcript +
// composer) in AgentChatPanel — the header above (name/status/icons) stays
// put, only this region swaps between chat and timeline.
export function AgentTimelineView({
  agentId,
  onBack,
}: {
  agentId: string;
  onBack: () => void;
}) {
  const venue = useAuthenticatedVenue();
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (!venue) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    venue.workspace
      .read(`g/${agentId}/timeline`)
      .then((result) => (Array.isArray(result?.value) ? result.value : []))
      .then((entries) => {
        if (cancelled) return;
        // Newest first — matches the session list's most-recent-first ordering.
        setTimeline([...(entries as TimelineEntry[])].reverse());
      })
      .catch((error) => {
        if (!cancelled) notifyError("Unable to load agent timeline", error, venue.baseUrl);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venue, agentId]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={onBack}>
        <ArrowLeft size={15} /> Chat
      </Button>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {!loading && timeline.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No timeline entries yet for this agent.
        </p>
      )}

      {!loading && timeline.length > 0 && (
        <div className="relative border-l border-border ml-1.5 pb-2">
          {timeline.map((entry, i) => (
            <TimelineCard key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
