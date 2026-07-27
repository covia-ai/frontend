"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FiltersSheet } from "@/components/FiltersSheet";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { useHitlRequests } from "@/hooks/use-hitl";
import {
  grantAskOf,
  missingRequiredAnswers,
  respondToHitl,
  type HitlAnswer,
  type HitlAsk,
  type HitlRequest,
} from "@/lib/hitl";
import { Identicon } from "@/components/Identicon";
import { HitlGrantAsk } from "@/components/HitlGrantAsk";
import { Bot, ChevronDown, ChevronUp, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Empty selection means "no filter" (show every status) — same convention as
// the Status group on the Jobs filter sheet — so there's no separate "All"
// option here.
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
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
  // A grant/token request is never quick-answered — conferring authority or
  // signing a token is always a deliberate, reviewed action.
  if (asks.length !== 1 || grantAskOf(request)) return null;
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
    <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground" title={request.from}>
      <Identicon did={request.from} size={16} />
      <span className="font-mono truncate">{shortDid(request.from)}{isSelf ? " (you)" : ""}</span>
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
  // signed-in gate keys off the selected venue while the Venue is built from the
  // current venue's id; when those drift the page renders as signed in but
  // reads anonymously, which the venue answers with a 401. Reporting both
  // makes that distinguishable from a genuine credential problem.
  const credsForVenue = useAuthStore((x) => (venue ? x.authMap[venue.venueId] ?? null : null));
  // Only a did:key holder can sign a self-sovereign token (COG-19); a bearer
  // login has no client key. null disables signing with an explanation.
  const signingKeyHex = credsForVenue?.type === "keypair" ? credsForVenue.privateKeyHex : null;

  // Defaults to just "open" rather than empty (= everything) — an inbox
  // should surface what's actionable first.
  const [statusFilter, setStatusFilter] = useState<string[]>(["open"]);
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
    const base = statusFilter.length === 0
      ? requests
      : requests.filter((r) => statusFilter.includes(r.status));
    if (!justAnsweredId || base.some((r) => r.id === justAnsweredId)) return base;
    const pinned = requests.find((r) => r.id === justAnsweredId);
    return pinned ? [pinned, ...base] : base;
  }, [requests, statusFilter, justAnsweredId]);

  function changeStatusFilter(next: string[]) {
    setStatusFilter(next);
    setJustAnsweredId(null);
  }

  function toggleExpanded(request: HitlRequest) {
    // Draft answers/comment are staged here regardless of which way the form
    // closes, so a cancelled draft can never bleed into a later quick-answer
    // on this card or any other (covia-ai/frontend#196).
    setAnswers({});
    setComment("");
    setExpandedId(expandedId === request.id ? null : request.id);
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
      <div className="flex gap-2 items-center justify-end">
        <FiltersSheet
          title="Filter Requests"
          description="Narrow down HITL requests by status."
          groups={[
            { label: "Status", options: STATUS_OPTIONS, selected: statusFilter, onChange: changeStatusFilter },
          ]}
        />
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

      {!loading && requests.length > 0 && (
        <div className="flex flex-row flex-nowrap items-center justify-between w-full gap-4">
          <span className="text-card-foreground text-xs whitespace-nowrap">
            Showing {visible.length} of {requests.length}
          </span>
        </div>
      )}

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
            const grant = grantAskOf(request);
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
                      {grant?.kind === "token" ? "Signs a capability token"
                        : grant?.kind === "grant" ? "Grants capabilities"
                        : `${asks.length} ${asks.length === 1 ? "ask" : "asks"}`}
                    </span>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      data-testid="hitl-respond-toggle"
                      disabled={busy}
                      onClick={() => toggleExpanded(request)}
                    >
                      {grant?.kind === "token" ? "Review & sign" : grant ? "Review grant" : "Respond"}
                      <ChevronDown size={14} className="ml-1" />
                    </Button>
                  </div>
                )}

                {/* A token/grant request gets the capability surface; everything
                    else the generic ask form. */}
                {isOpen && expanded && grant && (
                  <HitlGrantAsk
                    request={request}
                    ask={grant.ask}
                    kind={grant.kind}
                    venue={venue}
                    signingKeyHex={signingKeyHex}
                    onDone={() => { setExpandedId(null); setJustAnsweredId(request.id); refresh(); }}
                    onCancel={() => toggleExpanded(request)}
                  />
                )}

                {isOpen && expanded && !grant && (
                  <div className="flex flex-col gap-4 border-t pt-3">
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
