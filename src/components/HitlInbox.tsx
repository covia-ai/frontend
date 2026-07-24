"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { useHitlRequests } from "@/hooks/use-hitl";
import {
  missingRequiredAnswers,
  respondToHitl,
  type HitlAnswer,
  type HitlAsk,
  type HitlRequest,
} from "@/lib/hitl";
import { Bot, ChevronDown, ChevronUp, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ALL = "_all_";

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: ALL, label: "All" },
  { value: "answered", label: "Answered" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function formatWhen(ms?: number): string {
  return ms ? new Date(ms).toLocaleString() : "";
}

// DIDs are too long to sit in a card row; the full value stays in `title`.
function shortDid(did?: string): string {
  if (!did) return "unknown sender";
  return did.length > 28 ? `${did.slice(0, 18)}…${did.slice(-6)}` : did;
}

// True if the request offers capability grants anywhere. Grants are shown but
// never echoed (see respondToHitl), and a request carrying them is never
// answerable in one click — the warning has to be read first.
function offersGrants(request: HitlRequest): boolean {
  return (request.asks ?? []).some(
    (ask) => (ask.grants?.length ?? 0) > 0 || (ask.options ?? []).some((o) => (o.grants?.length ?? 0) > 0),
  );
}

// Answers come back as raw option ids, so they have to be mapped through the
// ask's own options — showing "tonight" instead of "Tonight 22:00" would make a
// resolved request harder to read than the form that produced it.
function formatAnswer(ask: HitlAsk, value: HitlAnswer | undefined): string {
  if (value === undefined || value === null) return "—";
  const labelFor = (id: string) => ask.options?.find((o) => o.id === id)?.label ?? id;

  if (ask.type === "approval") return value ? "Yes" : "No";
  if (ask.type === "choice") return labelFor(String(value));
  if (ask.type === "checkboxes") {
    const ids = Array.isArray(value) ? value : [];
    return ids.length ? ids.map(labelFor).join(", ") : "none";
  }
  const text = String(value);
  return text.trim() ? text : "—";
}

// A single approval or choice is one decision, so it resolves in one click
// straight from the card. Anything else — several asks, free text, multi-select
// — needs a form, and gets one inline.
function quickAsk(request: HitlRequest): HitlAsk | null {
  const asks = request.asks ?? [];
  if (asks.length !== 1 || offersGrants(request)) return null;
  const ask = asks[0];
  return ask.type === "approval" || ask.type === "choice" ? ask : null;
}

// Who raised this. An agent request still carries its owner's DID in `from`,
// but the agent is the useful attribution — a raw owner DID tells you nothing
// about which of your agents is blocked waiting on you.
function Requester({ request, selfDid }: { request: HitlRequest; selfDid?: string }) {
  if (request.agent) {
    return (
      <div className="flex items-center gap-2 min-w-0 text-xs" title={request.from}>
        <Bot size={14} className="text-muted-foreground shrink-0" />
        <span className="truncate">
          Agent <span className="font-medium">{request.agent}</span>
        </span>
        <Link
          href={`/agents/explorer?agentId=${encodeURIComponent(request.agent)}`}
          data-testid="hitl-view-agent"
          className="text-primary hover:underline whitespace-nowrap shrink-0"
        >
          View agent
        </Link>
      </div>
    );
  }
  const isSelf = !!selfDid && selfDid === request.from;
  return (
    <div className="text-xs text-muted-foreground font-mono truncate" title={request.from}>
      {shortDid(request.from)}{isSelf ? " (you)" : ""}
    </div>
  );
}

// Every option is a button. A select would cost an open, a pick and a close for
// what is one decision, and hides the alternatives until you go looking.
function AskControl({
  ask,
  value,
  disabled,
  onChange,
}: {
  ask: HitlAsk;
  value: HitlAnswer | undefined;
  disabled?: boolean;
  onChange: (value: HitlAnswer) => void;
}) {
  if (ask.type === "text") {
    return (
      <Textarea
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer…"
      />
    );
  }

  if (ask.type === "approval") {
    return (
      <div className="flex flex-wrap gap-2">
        {[
          { id: "yes", label: "Yes", val: true },
          { id: "no", label: "No", val: false },
        ].map((o) => (
          <Button
            key={o.id}
            type="button"
            size="sm"
            data-testid="hitl-ask-option"
            variant={value === o.val ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onChange(o.val)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    );
  }

  if (ask.type === "choice") {
    return (
      <div className="flex flex-wrap gap-2">
        {(ask.options ?? []).map((o) => (
          <Button
            key={o.id}
            type="button"
            size="sm"
            data-testid="hitl-ask-option"
            title={o.description}
            variant={value === o.id ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="flex flex-wrap gap-2">
      {(ask.options ?? []).map((o) => {
        const on = selected.includes(o.id);
        return (
          <Button
            key={o.id}
            type="button"
            size="sm"
            data-testid="hitl-ask-option"
            title={o.description}
            aria-pressed={on}
            variant={on ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onChange(on ? selected.filter((i) => i !== o.id) : [...selected, o.id])}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

export function HitlInbox() {
  const venue = useAuthenticatedVenue();
  const { requests, loading, error, refresh } = useHitlRequests();
  // Whether stored credentials exist for *the venue actually being read*. The
  // signed-in gate keys off activeVenueId while the Venue is built from the
  // current venue's id; when those drift the page renders as signed in but
  // reads anonymously, which the venue answers with a 401. Reporting both
  // makes that distinguishable from a genuine credential problem.
  const credsForVenue = useAuthStore((x) => (venue ? x.authMap[venue.venueId] ?? null : null));

  const [statusFilter, setStatusFilter] = useState<string>("open");
  // Only one request is ever open for editing, so its draft can live here
  // rather than in a map keyed by request id.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, HitlAnswer>>({});
  const [comment, setComment] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  // Answering moves a request out of the default Open filter, so without this
  // the card you just acted on vanishes and you never see what you decided.
  const [justAnsweredId, setJustAnsweredId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const base = statusFilter === ALL ? requests : requests.filter((r) => r.status === statusFilter);
    if (!justAnsweredId || base.some((r) => r.id === justAnsweredId)) return base;
    const pinned = requests.find((r) => r.id === justAnsweredId);
    return pinned ? [pinned, ...base] : base;
  }, [requests, statusFilter, justAnsweredId]);

  function changeStatusFilter(next: string) {
    setStatusFilter(next);
    setJustAnsweredId(null);
  }

  function toggleExpanded(request: HitlRequest) {
    if (expandedId === request.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(request.id);
    setAnswers({});
    setComment("");
  }

  async function send(
    request: HitlRequest,
    outcome: "answer" | "reject",
    override?: Record<string, HitlAnswer>,
  ) {
    if (!venue) return;
    const body = override ?? answers;
    if (outcome === "answer") {
      const missing = missingRequiredAnswers(request.asks ?? [], body);
      if (missing.length > 0) {
        toast("Some required asks are unanswered", { description: missing.join(", ") });
        return;
      }
    }
    setSubmittingId(request.id);
    try {
      await respondToHitl(venue, {
        id: request.id,
        outcome,
        ...(outcome === "answer" ? { answers: body } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast(outcome === "answer" ? "Response sent" : "Request rejected");
      setExpandedId(null);
      setAnswers({});
      setComment("");
      setJustAnsweredId(request.id);
      refresh();
    } catch (err) {
      toast("Unable to send response", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={changeStatusFilter}>
          <SelectTrigger className="w-44 shrink-0" data-testid="hitl-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {visible.length} of {requests.length}
          </span>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="icon"
          data-testid="hitl-refresh"
          aria-label="Refresh HITL requests"
          title="Refresh HITL requests"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner variant="ellipsis" className="text-primary" size={48} />
        </div>
      )}

      {!loading && error && (
        <div
          data-testid="hitl-error"
          className="border border-destructive/40 rounded-md p-4 flex flex-col gap-1"
        >
          <div className="text-sm font-medium text-destructive">Couldn&apos;t read your inbox</div>
          <div className="text-sm text-muted-foreground break-words">{error}</div>
          <div className="text-xs text-muted-foreground mt-1">
            The inbox lives in your own namespace on one venue — check that the selected
            venue is the one holding your requests, and that you are signed in with the
            same key.
          </div>
          <div
            data-testid="hitl-error-context"
            className="text-xs text-muted-foreground mt-2 font-mono break-all"
          >
            venue {venue?.baseUrl ?? "(none)"} · id {venue?.venueId ?? "(none)"} ·
            {" "}credentials stored for this venue: {credsForVenue ? `yes (${credsForVenue.did})` : "NONE"}
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Inbox size={64} className="text-primary" />
          <div className="text-primary text-lg">Nothing waiting on you</div>
          <div className="text-card-foreground text-sm">
            Requests that need your decision will appear here.
          </div>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-3">
          {visible.map((request) => {
            const quick = quickAsk(request);
            const isOpen = request.status === "open";
            const expanded = expandedId === request.id;
            const busy = submittingId === request.id;
            const asks = request.asks ?? [];

            return (
              <Card key={request.id} className="p-4 flex flex-col gap-3" data-testid="hitl-request">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{request.title}</div>
                    {request.description && (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {request.description}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={request.status} kind="hitl" as="pill" className="shrink-0 text-xs" />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Requester request={request} selfDid={credsForVenue?.did} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatWhen(request.created)}
                  </span>
                </div>

                {/* Resolved → show what was decided, not just a status pill. */}
                {!isOpen && request.response && (
                  <div data-testid="hitl-result" className="border-t pt-3 flex flex-col gap-1">
                    {request.response.outcome === "reject" ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Rejected</span>
                        {request.response.comment && (
                          <span className="text-muted-foreground"> — {request.response.comment}</span>
                        )}
                      </div>
                    ) : (
                      <>
                        {asks.map((ask) => (
                          <div key={ask.id} className="flex items-baseline gap-3 text-sm">
                            <span className="text-muted-foreground truncate">{ask.prompt}</span>
                            <span className="flex-1 border-b border-dotted border-muted-foreground/30" />
                            <span className="font-medium shrink-0" data-testid="hitl-result-answer">
                              {formatAnswer(ask, request.response?.answers?.[ask.id])}
                            </span>
                          </div>
                        ))}
                        {request.response.comment && (
                          <div className="text-sm text-muted-foreground mt-1 italic">
                            {request.response.comment}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* One decision → answer it straight from the card. */}
                {isOpen && quick && !expanded && (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <span className="text-sm mr-1">{quick.prompt}</span>
                    {quick.type === "approval" ? (
                      <>
                        <Button
                          size="sm"
                          data-testid="hitl-quick-answer"
                          disabled={busy}
                          onClick={() => send(request, "answer", { [quick.id]: true })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="hitl-quick-answer"
                          disabled={busy}
                          onClick={() => send(request, "answer", { [quick.id]: false })}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      (quick.options ?? []).map((o) => (
                        <Button
                          key={o.id}
                          size="sm"
                          data-testid="hitl-quick-answer"
                          title={o.description}
                          disabled={busy}
                          onClick={() => send(request, "answer", { [quick.id]: o.id })}
                        >
                          {o.label}
                        </Button>
                      ))
                    )}
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid="hitl-reject"
                      className="text-muted-foreground"
                      disabled={busy}
                      onClick={() => send(request, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {/* Several asks, or one that needs typing — form, inline. */}
                {isOpen && !quick && !expanded && (
                  <div className="flex items-center gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      {asks.length} {asks.length === 1 ? "ask" : "asks"}
                    </span>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      data-testid="hitl-respond-toggle"
                      disabled={busy}
                      onClick={() => toggleExpanded(request)}
                    >
                      Respond <ChevronDown size={14} className="ml-1" />
                    </Button>
                  </div>
                )}

                {isOpen && expanded && (
                  <div className="flex flex-col gap-4 border-t pt-3">
                    {offersGrants(request) && (
                      <p className="text-xs text-muted-foreground border rounded-md p-2">
                        This request offers capability grants. Responding here confers none
                        of them — grant them deliberately via the API if that is your intent.
                      </p>
                    )}

                    {asks.map((ask) => (
                      <div key={ask.id} className="flex flex-col gap-2">
                        <Label className="text-sm">
                          {ask.prompt}
                          {ask.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <AskControl
                          ask={ask}
                          value={answers[ask.id]}
                          disabled={busy}
                          onChange={(value) => setAnswers((prev) => ({ ...prev, [ask.id]: value }))}
                        />
                      </div>
                    ))}

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm">Comment</Label>
                      <Textarea
                        value={comment}
                        disabled={busy}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional — the reason the requester sees when rejecting."
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        data-testid="hitl-submit"
                        disabled={busy}
                        onClick={() => send(request, "answer")}
                      >
                        {busy ? "Sending…" : "Send response"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid="hitl-reject"
                        disabled={busy}
                        onClick={() => send(request, "reject")}
                      >
                        Reject
                      </Button>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => toggleExpanded(request)}
                      >
                        Cancel <ChevronUp size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
