"use client";

import { useState } from "react";
import { ArrowLeft, Eye, Loader2, RefreshCw } from "lucide-react";
import { RawTextPanel } from "@/components/content-preview/RawTextPanel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { formatSessionLabel } from "@/lib/agent-sessions";
import { notifyError } from "@/lib/notify";
import type { Session } from "@/config/types";

type AgentContextResponse = {
  sessionTokens?: { input?: number; output?: number; total?: number };
  budget?: { bytes?: number; used?: number; remaining?: number };
  [key: string]: unknown;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

// Inline replacement for the chat area, sibling to AgentTimelineView — see
// covia-ai/frontend#164. Unlike AgentTimelineView (a job-free
// workspace.read), v/ops/agent/context has no job-free path: it's a live,
// computed inspection dispatched via venue.operations.run, which persists a
// Job. So this never auto-fetches on mount — "Load context" is the explicit
// user-driven action that's allowed to create one (AGENTS.md: reads must
// not create jobs; page loads/navigation must not invoke).
export function AgentContextView({
  agentId,
  sessions,
  initialSessionId,
  onBack,
}: {
  agentId: string;
  sessions: Session[];
  initialSessionId: string | null;
  onBack: () => void;
}) {
  const venue = useAuthenticatedVenue();
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [data, setData] = useState<AgentContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = () => {
    if (!venue) return;
    setLoading(true);
    setError(null);
    venue.operations
      .run<AgentContextResponse>("v/ops/agent/context", {
        agentId,
        sessionId: selectedSessionId ?? undefined,
      })
      .then((result) => setData(result))
      .catch((err) => {
        notifyError("Unable to load agent context", err, venue.baseUrl);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  };

  const sessionTokens = data?.sessionTokens;
  const budget = data?.budget;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={onBack}>
        <ArrowLeft size={15} /> Chat
      </Button>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Eye size={16} className="text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Context
        </span>
        <Select
          value={selectedSessionId ?? ""}
          onValueChange={(value) => {
            setSelectedSessionId(value);
            setData(null);
            setError(null);
          }}
        >
          <SelectTrigger className="w-72" data-testid="context-session-select">
            <SelectValue placeholder="Choose a session" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((session) => (
              <SelectItem key={session.sessionId} value={session.sessionId}>
                {formatSessionLabel(session)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!venue || !selectedSessionId || loading}
          onClick={loadContext}
          data-testid="load-context-button"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : data ? (
            <RefreshCw size={14} />
          ) : null}
          {data ? "Refresh" : "Load context"}
        </Button>
      </div>

      {(sessionTokens || budget) && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sessionTokens?.total !== undefined && (
            <Stat label="Session tokens" value={String(sessionTokens.total)} />
          )}
          {sessionTokens?.input !== undefined && (
            <Stat label="Input tokens" value={String(sessionTokens.input)} />
          )}
          {sessionTokens?.output !== undefined && (
            <Stat label="Output tokens" value={String(sessionTokens.output)} />
          )}
          {budget?.used !== undefined && budget?.bytes !== undefined && (
            <Stat label="Budget used" value={`${budget.used} / ${budget.bytes} bytes`} />
          )}
        </div>
      )}

      <RawTextPanel
        value={data ? JSON.stringify(data, null, 2) : ""}
        loading={loading}
        error={error}
      />
    </div>
  );
}
