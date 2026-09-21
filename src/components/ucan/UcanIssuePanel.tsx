"use client";

import { useState } from "react";
import { Copy, Lock, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { notifyError, notifySuccess } from "@/lib/notify";
import { TONE_STYLES } from "@/lib/status";
import {
  broadScopes,
  EMPTY_ROW,
  expiryDate,
  expiryFromNow,
  hasIncompleteRow,
  lifetimeSeconds,
  selfAttenuation,
  usableRows,
  type AttRow,
  type LifetimeUnit,
} from "@/lib/ucan-console";

/**
 * Issuance is deliberately harder to reach than verification. Minting a
 * capability hands someone authority over your data, so the form stays behind
 * an explicit advanced gate and a broad scope needs its own confirmation —
 * nobody should delegate `*` by tabbing past it.
 */
export function UcanIssuePanel() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const [advanced, setAdvanced] = useState(false);

  if (!isAuthenticated) {
    return (
      <Card className="p-6 text-center">
        <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 font-medium text-foreground">Sign in to issue capabilities</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Verification is open to everyone. Minting a grant acts as you, so it
          needs an account.
        </p>
      </Card>
    );
  }

  if (!advanced) {
    return (
      <Card className="p-6" data-testid="ucan-issue-gate">
        <div className="flex items-start gap-3">
          <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${TONE_STYLES.attention.text}`} />
          <div>
            <p className="font-medium text-foreground">Advanced: issue a capability</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A capability token delegates authority over your resources to
              whoever holds it, until it expires. Most people never need to mint
              one by hand — agents and the approval inbox issue what they need.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              data-testid="ucan-issue-reveal"
              onClick={() => setAdvanced(true)}
            >
              I understand — show the issuance form
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return <IssueForm venueDid={venue?.venueId ?? ""} />;
}

function IssueForm({ venueDid }: { venueDid: string }) {
  const venue = useAuthenticatedVenue();
  const [audience, setAudience] = useState(venueDid);
  const [rows, setRows] = useState<AttRow[]>([selfAttenuation()]);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<LifetimeUnit>("hours");
  const [confirmedBroad, setConfirmedBroad] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<{ token: string; expiresAt: Date | null } | null>(null);

  const caps = usableRows(rows);
  const broad = broadScopes(rows);
  const seconds = lifetimeSeconds(amount, unit);
  const lifetimeValid = Number.isFinite(seconds) && seconds >= 60;

  const blocked =
    !venue ||
    caps.length === 0 ||
    hasIncompleteRow(rows) ||
    !audience.trim().startsWith("did:") ||
    !lifetimeValid ||
    (broad.length > 0 && !confirmedBroad);

  // A minted token belongs to the inputs that produced it. Any edit drops it,
  // so the copy button can never hand over a token for a scope now on screen.
  const edit = (apply: () => void) => {
    setMinted(null);
    apply();
  };

  const setRow = (index: number, patch: Partial<AttRow>) =>
    edit(() => {
      setConfirmedBroad(false);
      setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    });

  const mint = async () => {
    if (!venue) return;
    setMinting(true);
    try {
      const exp = expiryFromNow(seconds);
      const result = await venue.ucan.issue(audience.trim(), caps, exp);
      setMinted({ token: result.token, expiresAt: expiryDate(exp) });
      notifySuccess("Capability issued");
    } catch (err) {
      setMinted(null);
      notifyError("Unable to issue capability", err, venue.baseUrl);
    } finally {
      setMinting(false);
    }
  };

  const copy = async () => {
    if (!minted) return;
    try {
      await navigator.clipboard.writeText(minted.token);
      notifySuccess("Capability token copied");
    } catch (err) {
      notifyError("Unable to copy capability token", err);
    }
  };

  return (
    <Card className="p-4 space-y-5" data-testid="ucan-issue-form">
      <div>
        <Label htmlFor="ucan-issue-aud" className="mb-1">Audience (who receives it)</Label>
        <Input
          id="ucan-issue-aud"
          data-testid="ucan-issue-aud"
          value={audience}
          onChange={(e) => edit(() => setAudience(e.target.value))}
          className="font-mono text-xs"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Defaults to this venue&apos;s DID. A token is usable only by its audience.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Capabilities</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="ucan-issue-add-row"
            onClick={() => edit(() => setRows((current) => [...current, { ...EMPTY_ROW }]))}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2">
              <Input
                aria-label={`Resource ${index + 1}`}
                data-testid={`ucan-issue-with-${index}`}
                value={row.with}
                onChange={(e) => setRow(index, { with: e.target.value })}
                placeholder="/w/reports/"
                className="font-mono text-xs"
              />
              <Input
                aria-label={`Ability ${index + 1}`}
                data-testid={`ucan-issue-can-${index}`}
                value={row.can}
                onChange={(e) => setRow(index, { can: e.target.value })}
                placeholder="crud/read"
                className="font-mono text-xs"
              />
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove capability ${index + 1}`}
                  onClick={() =>
                    edit(() => {
                      setConfirmedBroad(false);
                      setRows((current) => current.filter((_, i) => i !== index));
                    })
                  }
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pre-filled with read over your own workspace. A bare path is
          canonicalised against you at issuance.
        </p>
      </div>

      <div>
        <Label htmlFor="ucan-issue-amount" className="mb-1">Lifetime</Label>
        <div className="flex gap-2">
          <Input
            id="ucan-issue-amount"
            data-testid="ucan-issue-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => edit(() => setAmount(e.target.value))}
            className="w-24"
          />
          <Select value={unit} onValueChange={(v) => edit(() => setUnit(v as LifetimeUnit))}>
            <SelectTrigger data-testid="ucan-issue-unit" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
              <SelectItem value="days">days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Always finite. The console will not mint a non-expiring capability.
        </p>
      </div>

      {broad.length > 0 && (
        <div
          className={`rounded-lg p-3 ${TONE_STYLES.attention.banner}`}
          data-testid="ucan-issue-broad-warning"
        >
          <p className={`text-sm font-medium ${TONE_STYLES.attention.text}`}>
            This grant is broad
          </p>
          <ul className="mt-1 space-y-0.5">
            {broad.map((row, index) => (
              <li key={index} className="font-mono text-xs text-muted-foreground">
                {row.can} on {row.with}
              </li>
            ))}
          </ul>
          <label className="mt-2 flex items-start gap-2 text-sm text-foreground">
            <Checkbox
              data-testid="ucan-issue-confirm-broad"
              checked={confirmedBroad}
              onCheckedChange={(checked) => edit(() => setConfirmedBroad(checked === true))}
              className="mt-0.5"
            />
            <span>
              I mean to delegate this. The audience can exercise it anywhere
              this venue honours the grant, until it expires.
            </span>
          </label>
        </div>
      )}

      <Button data-testid="ucan-issue-mint" onClick={mint} disabled={blocked || minting}>
        {minting ? "Issuing…" : "Issue capability"}
      </Button>

      {minted && (
        <div data-testid="ucan-issue-result">
          <div className="flex items-center gap-2">
            <code
              data-testid="ucan-issue-token"
              className="bg-muted max-h-32 flex-1 overflow-y-auto rounded-md px-3 py-2 font-mono text-xs break-all select-all"
            >
              {minted.token}
            </code>
            <Button
              variant="outline"
              size="icon"
              data-testid="ucan-issue-copy"
              aria-label="Copy capability token"
              onClick={copy}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {minted.expiresAt
              ? `Expires ${minted.expiresAt.toLocaleString()}. Shown once — copy it now.`
              : "Shown once — copy it now."}
          </p>
        </div>
      )}
    </Card>
  );
}
