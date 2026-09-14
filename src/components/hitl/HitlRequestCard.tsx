"use client";

import { memo, useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import {
  Bot,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  KeyRound,
  ListChecks,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { DidDisplay } from "@/components/DidDisplay";
import { HitlGrantAsk } from "@/components/HitlGrantAsk";
import { TypeTile } from "@/components/TypeTile";
import {
  grantAskOf,
  missingRequiredAnswers,
  respondToHitl,
  type HitlAnswer,
  type HitlAsk,
  type HitlRequest,
} from "@/lib/hitl";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";

function formatWhen(ms?: number): string {
  return ms ? new Date(ms).toLocaleString() : "";
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

// The at-a-glance glyph for what the request is asking for, on the house
// TypeTile vocabulary. Security-sensitive asks (sign a token / grant caps) get
// the primary tint; ordinary asks the secondary tint.
type AskGlyph = { Icon: ComponentType<{ size?: number }>; tile: string; label: string };
function askGlyph(request: HitlRequest): AskGlyph {
  const grant = grantAskOf(request);
  if (grant?.kind === "token") return { Icon: KeyRound, tile: "bg-primary/10 text-primary", label: "Token signing" };
  if (grant?.kind === "grant") return { Icon: ShieldCheck, tile: "bg-primary/10 text-primary", label: "Capability grant" };
  const asks = request.asks ?? [];
  const secondary = "bg-secondary/15 text-secondary";
  if (asks.length === 1) {
    const t = asks[0].type;
    if (t === "text") return { Icon: MessageSquare, tile: secondary, label: "Text response" };
    if (t === "approval") return { Icon: ShieldCheck, tile: secondary, label: "Approval" };
    if (t === "choice") return { Icon: ListChecks, tile: secondary, label: "Choice" };
    if (t === "checkboxes") return { Icon: CheckSquare, tile: secondary, label: "Checkboxes" };
  }
  return { Icon: ListChecks, tile: secondary, label: "Multiple asks" };
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
          href={`/agents/agent/${encodeURIComponent(request.agent)}`}
          data-testid="hitl-view-agent"
          className="text-primary hover:underline whitespace-nowrap shrink-0"
        >
          View agent
        </Link>
      </div>
    );
  }
  const isSelf = !!selfDid && selfDid === request.from;
  if (!request.from) {
    return <span className="text-xs text-muted-foreground">unknown sender</span>;
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
      <DidDisplay value={request.from} chars={18} />
      {isSelf && <span className="shrink-0">(you)</span>}
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

export type HitlRequestCardProps = {
  request: HitlRequest;
  selfDid?: string;
  venue: Venue | null;
  signingKeyHex: string | null;
  expanded: boolean;
  // Parent owns which card is expanded (only one at a time) and the just-
  // answered pin; the draft itself lives here so it can never bleed across
  // cards (covia-ai/frontend#196 is structural now, not a manual clear).
  onToggleExpanded: (id: string) => void;
  onAnswered: (id: string) => void;
};

function HitlRequestCardInner({
  request,
  selfDid,
  venue,
  signingKeyHex,
  expanded,
  onToggleExpanded,
  onAnswered,
}: HitlRequestCardProps) {
  const [answers, setAnswers] = useState<Record<string, HitlAnswer>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const quick = quickAsk(request);
  const grant = grantAskOf(request);
  const isOpen = request.status === "open";
  const asks = request.asks ?? [];
  const glyph = askGlyph(request);

  // On expand, move focus into the respond form so keyboard/AT users land in
  // the controls rather than stranded on the toggle they just pressed.
  useEffect(() => {
    if (!expanded) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      "textarea, input, select, button, [tabindex]",
    );
    el?.focus();
  }, [expanded]);

  function toggle() {
    // Local draft is discarded on every open/close, so reopening a card starts
    // clean — and because it's local it can never reach another card.
    setAnswers({});
    setComment("");
    onToggleExpanded(request.id);
  }

  async function send(outcome: "answer" | "reject", override?: Record<string, HitlAnswer>) {
    if (!venue) return;
    const body = override ?? answers;
    if (outcome === "answer") {
      const missing = missingRequiredAnswers(request.asks ?? [], body);
      if (missing.length > 0) {
        notifyWarning("Some required asks are unanswered", { description: missing.join(", ") });
        return;
      }
    }
    setSubmitting(true);
    try {
      await respondToHitl(venue, {
        id: request.id,
        outcome,
        ...(outcome === "answer" ? { answers: body } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      notifySuccess(outcome === "answer" ? "Response sent" : "Request rejected");
      setAnswers({});
      setComment("");
      onAnswered(request.id);
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to send response", reason, venue.baseUrl, jobHref);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting;

  return (
    <Card className="p-4 flex flex-col gap-3" data-testid="hitl-request">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <TypeTile Icon={glyph.Icon} tile={glyph.tile} className="size-9 mt-0.5" iconSize={16} title={glyph.label} />
          <div className="min-w-0">
            <div className="font-medium">{request.title}</div>
            {request.description && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {request.description}
              </div>
            )}
          </div>
        </div>
        <StatusBadge status={request.status} kind="hitl" as="pill" className="shrink-0 text-xs" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Requester request={request} selfDid={selfDid} />
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
                onClick={() => send("answer", { [quick.id]: true })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                data-testid="hitl-quick-answer"
                disabled={busy}
                onClick={() => send("answer", { [quick.id]: false })}
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
                onClick={() => send("answer", { [quick.id]: o.id })}
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
            onClick={() => send("reject")}
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
            onClick={toggle}
          >
            {grant?.kind === "token" ? "Review & sign" : grant ? "Review grant" : "Respond"}
            <ChevronDown size={14} className="ml-1" />
          </Button>
        </div>
      )}

      {/* A token/grant request gets the capability surface; everything else the
          generic ask form. One ref wraps whichever expands, for focus-on-open. */}
      {isOpen && expanded && (
        <div ref={formRef}>
          {grant ? (
            <HitlGrantAsk
              request={request}
              ask={grant.ask}
              kind={grant.kind}
              venue={venue}
              signingKeyHex={signingKeyHex}
              onDone={() => onAnswered(request.id)}
              onCancel={toggle}
            />
          ) : (
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
                <Button size="sm" data-testid="hitl-submit" disabled={busy} onClick={() => send("answer")}>
                  {busy ? "Sending…" : "Send response"}
                </Button>
                <Button size="sm" variant="outline" data-testid="hitl-reject" disabled={busy} onClick={() => send("reject")}>
                  Reject
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" disabled={busy} onClick={toggle}>
                  Cancel <ChevronUp size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export const HitlRequestCard = memo(HitlRequestCardInner);
