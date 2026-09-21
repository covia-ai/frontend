"use client";

import { useState } from "react";
import type { UCANVerifyResult } from "@covia/covia-sdk";
import { ShieldCheck, ShieldX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DidDisplay } from "@/components/DidDisplay";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { notifyError } from "@/lib/notify";
import { TONE_STYLES } from "@/lib/status";
import {
  chainDepthLabel,
  expiryDate,
  ROOT_AUTHORITY_MEANING,
  rootAuthorityTone,
  verifyCheck,
  type AttRow,
} from "@/lib/ucan-console";

/**
 * The diagnostic half of the console, and the half that works signed out: a
 * token is evidence anyone holding it should be able to read. Verification is
 * the venue's own verdict (`ucan:verify`), not a client-side guess, so what
 * this panel shows is what enforcement would decide.
 */
export function UcanVerifyPanel() {
  const venue = useAuthenticatedVenue();
  const [token, setToken] = useState("");
  const [check, setCheck] = useState<AttRow>({ with: "", can: "" });
  const [result, setResult] = useState<UCANVerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const canVerify = token.trim().length > 0 && !!venue && !verifying;

  const verify = async () => {
    if (!venue) return;
    setVerifying(true);
    try {
      setResult(await venue.ucan.verify(token.trim(), verifyCheck(check)));
    } catch (err) {
      setResult(null);
      notifyError("Unable to verify capability", err, venue.baseUrl);
    } finally {
      setVerifying(false);
    }
  };

  // A verdict belongs to the token it was read from; drop it the moment the
  // inputs change so a stale "valid" can't be mistaken for the new paste.
  const edit = (apply: () => void) => {
    setResult(null);
    apply();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <Label htmlFor="ucan-verify-token" className="mb-1">Capability token</Label>
          <Textarea
            id="ucan-verify-token"
            data-testid="ucan-verify-token"
            value={token}
            onChange={(e) => edit(() => setToken(e.target.value))}
            placeholder="Paste a UCAN JWT"
            rows={4}
            className="font-mono text-xs"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Would it authorise a request?</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Optional. Name a resource and an ability to ask whether this venue
            would let the token through.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Resource to check"
              data-testid="ucan-verify-check-with"
              value={check.with}
              onChange={(e) => edit(() => setCheck((c) => ({ ...c, with: e.target.value })))}
              placeholder="/w/reports/"
              className="font-mono text-xs"
            />
            <Input
              aria-label="Ability to check"
              data-testid="ucan-verify-check-can"
              value={check.can}
              onChange={(e) => edit(() => setCheck((c) => ({ ...c, can: e.target.value })))}
              placeholder="crud/read"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <Button data-testid="ucan-verify-submit" onClick={verify} disabled={!canVerify}>
          <Search className="mr-1 h-4 w-4" />
          {verifying ? "Verifying…" : "Verify"}
        </Button>

        {!venue && (
          <p className="text-xs text-muted-foreground">
            Select a venue to verify against — the verdict is that venue&apos;s trust policy.
          </p>
        )}
      </Card>

      {result && <VerifyVerdict result={result} checked={verifyCheck(check)} />}
    </div>
  );
}

function VerifyVerdict({
  result,
  checked,
}: {
  result: UCANVerifyResult;
  checked: { with: string; can: string } | undefined;
}) {
  const tone = TONE_STYLES[result.valid ? "success" : "failure"];
  const Icon = result.valid ? ShieldCheck : ShieldX;
  const expires = expiryDate(result.exp);
  const depth = chainDepthLabel(result.chainDepth);

  return (
    <Card className={`p-4 space-y-4 ${tone.tint}`} data-testid="ucan-verify-result">
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text}`} />
        <div className="min-w-0">
          <p className={`font-semibold ${tone.text}`} data-testid="ucan-verify-validity">
            {result.valid ? "Valid" : "Not valid"}
          </p>
          {result.reason && (
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="ucan-verify-reason">
              {result.reason}
            </p>
          )}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        {result.iss && <Claim label="Issuer"><DidDisplay value={result.iss} chars={14} /></Claim>}
        {result.aud && <Claim label="Audience"><DidDisplay value={result.aud} chars={14} /></Claim>}
        {result.rootIssuer && (
          <Claim label="Root issuer"><DidDisplay value={result.rootIssuer} chars={14} /></Claim>
        )}
        {depth && <Claim label="Chain depth"><span className="text-muted-foreground">{depth}</span></Claim>}
        {expires && (
          <Claim label="Expires">
            <span className="text-muted-foreground" data-testid="ucan-verify-expiry">
              {expires.toLocaleString()}
            </span>
          </Claim>
        )}
      </dl>

      {checked && (
        <div
          className={`rounded-lg p-3 text-sm ${TONE_STYLES[result.authorises ? "success" : "attention"].banner}`}
          data-testid="ucan-verify-authorises"
        >
          {result.authorises
            ? "Authorises this request."
            : "Does not authorise this request. A caveated capability also reports false here, because a diagnostic has no invocation in which to run its policy gates."}
          <span className="block mt-1 font-mono text-xs text-muted-foreground">
            {checked.can} on {checked.with}
          </span>
        </div>
      )}

      {result.att && result.att.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Capabilities</p>
          <ul className="space-y-2" data-testid="ucan-verify-capabilities">
            {result.att.map((cap, index) => {
              const authority = cap.rootAuthority;
              const capTone = TONE_STYLES[rootAuthorityTone(authority)];
              return (
                <li
                  key={`${cap.with}-${cap.can}-${index}`}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs break-all">{cap.can}</code>
                    <span className="text-xs text-muted-foreground">on</span>
                    <code className="font-mono text-xs break-all">{cap.with}</code>
                    {authority && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${capTone.pill}`}>
                        {authority}
                      </span>
                    )}
                  </div>
                  {authority && ROOT_AUTHORITY_MEANING[authority] && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {ROOT_AUTHORITY_MEANING[authority]}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Claim({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
