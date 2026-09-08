"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DidDisplay } from "@/components/DidDisplay";
import { CapabilityTable, type CapRow } from "@/components/CapabilityTable";
import { useVenues } from "@/hooks/use-venues";
import {
  offeredGrantsOf, respondToHitl, signAccessToken, tokenSpecOf,
  type HitlAsk, type HitlCap, type HitlRequest,
} from "@/lib/hitl";
import type { Venue } from "@covia/covia-sdk";
import { KeyRound, ShieldCheck } from "lucide-react";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";

const LIFETIMES = [
  { value: "900", label: "15 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "86400", label: "24 hours" },
  { value: "604800", label: "7 days" },
];

/** Plain duration label for a lifetime the presets above don't cover. */
function lifetimeLabel(seconds: number): string {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    const days = seconds / 86400;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (seconds >= 3600 && seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `${seconds}s`;
}

interface HitlGrantAskProps {
  request: HitlRequest;
  ask: HitlAsk;
  kind: "token" | "grant";
  venue: Venue | null;
  /** The current identity's device key, when signed in with one. Only a
   *  did:key holder can sign a self-sovereign token (COG-19). */
  signingKeyHex: string | null;
  onDone: () => void;
  onCancel: () => void;
}

// The capability-review surface shared by both HITL granting cases:
//  - token (COG-19): the user edits the requested caps and SIGNS a self-sovereign
//    UCAN with their own key; the venue only transports it.
//  - grant (COG-17): the user selects which offered caps to approve; the VENUE
//    mints the token from the echoed grants.
// Same shape either way — a capability table, an audience, an expiry — so the
// two read alike; only who signs and the primary action differ.
export function HitlGrantAsk({ request, ask, kind, venue, signingKeyHex, onDone, onCancel }: HitlGrantAskProps) {
  const spec = tokenSpecOf(ask);
  const offered = offeredGrantsOf(ask);
  const { venues } = useVenues();

  // Must match the venue's expected audience exactly (COG-19): the ask's pinned
  // audience, else the requester (`from`). Never `agent` — that's a display
  // name, not a DID, and would fail the token's aud check.
  const audience = spec?.audience ?? request.from ?? "";
  const targetVenue = useMemo(
    () => (spec?.venue ? venues.find((v) => v.venueId === spec.venue) : undefined),
    [venues, spec?.venue],
  );

  const [rows, setRows] = useState<CapRow[]>(
    (kind === "token" ? spec?.caps ?? [] : offered).map((c) => ({ ...c, included: true })),
  );
  // Signing has no venue-side lifetime ceiling (self-sovereign UCAN, the
  // venue only transports it) — default to exactly what was requested, not
  // just whichever preset happens to already cover it (frontend#337).
  const [lifetime, setLifetime] = useState<string>(String(spec?.exp ?? 3600));
  // Always offer the requested lifetime as a selectable option, even off-preset.
  const lifetimeOptions = useMemo(() => {
    const requested = spec?.exp;
    if (!requested || LIFETIMES.some((l) => Number(l.value) === requested)) return LIFETIMES;
    return [...LIFETIMES, { value: String(requested), label: lifetimeLabel(requested) }]
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [spec?.exp]);
  const [submitting, setSubmitting] = useState(false);

  const canSignToken = kind !== "token" || !!signingKeyHex;

  async function send(outcome: "answer" | "reject") {
    if (!venue) return;
    setSubmitting(true);
    try {
      if (outcome === "reject") {
        await respondToHitl(venue, { id: request.id, outcome: "reject" });
        notifySuccess("Request rejected");
        onDone();
        return;
      }

      if (kind === "token") {
        const caps = rows.filter((r) => r.with.trim() && r.can.trim());
        if (caps.length === 0) { notifyWarning("Add at least one capability to sign"); return; }
        if (!signingKeyHex) { notifyWarning("Signing needs a device-key sign-in on this venue"); return; }
        const jwt = signAccessToken({
          privateKeyHex: signingKeyHex,
          audience,
          caps: caps.map((c) => ({ with: c.with.trim(), can: c.can.trim() })),
          lifetimeSeconds: Number(lifetime),
        });
        // The JWT is a secret; the venue routes it to the requester's `tokens`
        // output and keeps it out of the durable record (COG-19).
        await respondToHitl(venue, { id: request.id, outcome: "answer", answers: { [ask.id]: jwt } });
        notifySuccess("Access token signed and returned");
      } else {
        const grants: HitlCap[] = rows.filter((r) => r.included !== false).map((c) => ({ with: c.with, can: c.can, ...(c.exp ? { exp: c.exp } : {}) }));
        await respondToHitl(venue, { id: request.id, outcome: "answer", answers: { [ask.id]: true }, grants });
        notifySuccess(grants.length ? "Capabilities granted" : "Approved without granting any capability");
      }
      onDone();
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to send response", reason, venue.baseUrl, jobHref);
    } finally {
      setSubmitting(false);
    }
  }

  const isToken = kind === "token";

  return (
    <div className="flex flex-col gap-4 border-t pt-3" data-testid={`hitl-grant-${kind}`}>
      <div className="flex items-start gap-2">
        {isToken ? <KeyRound size={16} className="text-primary mt-0.5" /> : <ShieldCheck size={16} className="text-primary mt-0.5" />}
        <div className="text-sm">
          <div className="font-medium">
            {isToken ? "Sign an access token" : "Grant capabilities"}
          </div>
          <div className="text-xs text-muted-foreground">
            {isToken
              ? "You sign this with your own key. The holder acts as you for exactly these capabilities until it expires — verifiable on any venue where you are the owner."
              : "This venue mints a token for the capabilities you approve, valid on this venue."}
          </div>
        </div>
      </div>

      {/* Audience + target venue */}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs items-center">
        <span className="text-muted-foreground">To</span>
        <span className="flex items-center gap-1.5 min-w-0">
          {audience ? (
            <DidDisplay value={audience} chars={24} iconSize={14} />
          ) : (
            <span className="font-mono truncate">(the requester)</span>
          )}
        </span>
        {isToken && spec?.venue && (
          <>
            <span className="text-muted-foreground">On venue</span>
            <span className="min-w-0 truncate">
              {targetVenue
                ? <Link href={`/venues/${encodeURIComponent(targetVenue.venueId)}`} className="text-primary hover:underline">{targetVenue.metadata?.name ?? spec.venue}</Link>
                : <span className="font-mono">{spec.venue}</span>}
            </span>
          </>
        )}
      </div>

      <CapabilityTable
        mode={isToken ? "edit" : "select"}
        rows={rows}
        onChange={setRows}
        disabled={submitting}
      />

      {isToken && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Expires in</Label>
          <Select value={lifetime} onValueChange={setLifetime}>
            <SelectTrigger className="h-8 w-36" data-testid="token-lifetime"><SelectValue /></SelectTrigger>
            <SelectContent>
              {lifetimeOptions.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {isToken && !canSignToken && (
        <p className="text-xs text-destructive">
          Signing needs a device-key (did:key) sign-in on this venue. You&apos;re signed in another way,
          so this token can&apos;t be signed here.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          data-testid="hitl-grant-confirm"
          disabled={submitting || (isToken && !canSignToken)}
          onClick={() => send("answer")}
        >
          {submitting ? "Working…" : isToken ? "Sign & return" : "Approve & grant"}
        </Button>
        <Button size="sm" variant="outline" data-testid="hitl-grant-reject" disabled={submitting} onClick={() => send("reject")}>
          Reject
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" disabled={submitting} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
