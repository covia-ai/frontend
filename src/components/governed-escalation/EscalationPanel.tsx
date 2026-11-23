"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Job, Venue } from "@covia/covia-sdk";
import { ExternalLink, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { notifyError } from "@/lib/notify";
import {
  GrantVerification,
  extractGrantToken,
  findOpenAsk,
  verifyGrantToken,
} from "./beats";
import type { BeatJobState } from "@/components/demo-kit/BeatCard";

// Beat 4's surface. The approval itself happens in the REAL Inbox — this
// panel deep-links there and never rebuilds an approval form. On return it
// re-reads the parked job and, if the human approved, verifies the minted
// token with the venue's own ucan:verify so the grant on screen is
// cryptographically checked rather than merely displayed.

const toBeatJobState = (job: Job): BeatJobState => ({
  jobId: job.id,
  status: job.metadata?.status ?? null,
  error: job.metadata?.error ?? null,
  output: job.isComplete ? job.output : null,
});

export function EscalationPanel({
  venue,
  state,
  analysis,
  escalation,
}: {
  venue: Venue | null;
  state: BeatJobState | null;
  /** The monitor's own analysis job — real, and separate from the ask. */
  analysis: BeatJobState | null;
  /** Persisted ids, so the panel survives the trip to the Inbox and back. */
  escalation: { analysisJobId: string | null; askJobId: string } | null;
}) {
  const [ask, setAsk] = useState<{ id: string; title: string } | null>(null);
  // What this panel has found out about the ask's job on its own — the parked
  // job re-read after the trip to the Inbox, or a refresh — kept with the
  // `state` it was found under. A fresh `state` from the running flow
  // supersedes it; `state` falling away (the flow no longer driving) does not.
  const [learnt, setLearnt] = useState<{ under: BeatJobState | null; job: BeatJobState } | null>(null);
  const job = learnt && (state === null || learnt.under === state) ? learnt.job : state;
  const [grant, setGrant] = useState<GrantVerification | null>(null);
  const [checking, setChecking] = useState(false);

  // Re-read the parked job from the venue when nothing else knows it. Beat 4
  // deliberately sends the viewer to the Inbox and back, and a client-side
  // navigation drops React state — without this the panel would vanish and
  // the ask would look lost even though it is sitting on the venue in
  // INPUT_REQUIRED.
  const askJobId = escalation?.askJobId;
  const needsParkedJob = !!venue && !job && !!askJobId;
  useEffect(() => {
    if (!needsParkedJob || !venue || !askJobId) return;
    let active = true;
    venue.jobs
      .get(askJobId)
      .then((parked) => {
        if (active) setLearnt({ under: state, job: toBeatJobState(parked) });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [needsParkedJob, venue, askJobId, state]);

  // Find the ask this run raised, so the deep link lands on it rather than
  // dumping the viewer at the top of a list.
  useEffect(() => {
    if (!venue || !job) return;
    let active = true;
    findOpenAsk(venue)
      .then((found) => active && setAsk(found))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [venue, job]);

  const jobId = job?.jobId;
  const check = useCallback(async () => {
    if (!venue || !jobId) return;
    setChecking(true);
    try {
      const next = toBeatJobState(await venue.jobs.get(jobId));
      setLearnt({ under: state, job: next });
      const token = extractGrantToken(next.output);
      setGrant(token ? await verifyGrantToken(venue, token) : null);
    } catch (err) {
      notifyError("Unable to re-read the parked job", err, venue.baseUrl);
    } finally {
      setChecking(false);
    }
  }, [venue, jobId, state]);

  if (!job) return null;

  const parked = job.status === "INPUT_REQUIRED";

  return (
    <div className="rounded border p-3 flex flex-col gap-3" data-testid="ge-escalation">
      {analysis && (
        <p className="text-xs text-muted-foreground" data-testid="ge-analysis-note">
          The monitor evaluated the threshold itself, under its own capped
          authority (job{" "}
          <span className="font-mono">{analysis.jobId}</span>,{" "}
          {analysis.status}). The ask below was raised by this page carrying
          the monitor&apos;s finding verbatim — agents cannot raise HITL asks on
          this venue build, because every agent tool call is dispatched
          internally and the venue requires this operation to carry its own
          job (covia-ai/covia#316).
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Inbox className="size-4 text-primary" aria-hidden="true" />
          The ask is waiting for a human
        </p>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status ?? undefined} kind="job" as="pill" />
          <Button variant="ghost" size="sm" onClick={check} disabled={checking || !venue} data-testid="ge-refresh">
            <RefreshCw className={checking ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
      </div>

      {parked && (
        <p className="text-xs text-muted-foreground" data-testid="ge-parked">
          The monitor&apos;s job is parked in{" "}
          <span className="font-mono">INPUT_REQUIRED</span>. Nothing moves until a
          person decides — and the agent cannot decide for itself: the venue
          refuses an agent answering a HITL ask on{" "}
          <span className="font-medium text-foreground">identity</span>, not on
          scope, because approving one issues a capability grant.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={ask ? `/inbox?requestId=${encodeURIComponent(ask.id)}` : "/inbox"}
          data-testid="ge-inbox-link"
          className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
        >
          Answer it in your Inbox <ExternalLink className="size-3" />
        </Link>
        {ask && (
          <Badge variant="outline" className="font-mono text-[11px]">
            {ask.id}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Approve as the risk officer: review the requested capability, sign it
        with your own device key, and add a rationale. Then come back and
        refresh above — the parked job resumes on its own.
      </p>

      {grant && (
        <div
          className="rounded border p-2 flex flex-col gap-1"
          data-testid="ge-grant"
        >
          <p className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Self-signed grant
            <Badge variant={grant.valid ? "default" : "destructive"}>
              {grant.valid ? "verified" : (grant.reason ?? "invalid")}
            </Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            You signed this with your own device key — the venue transports and
            verifies it but never holds the authority. Checked with the
            venue&apos;s own <span className="font-mono">ucan:verify</span>
            {grant.issuer ? <> · issued by <span className="font-mono break-all">{grant.issuer}</span></> : null}
          </p>
          {grant.expiresAt && (
            <p className="text-xs" data-testid="ge-grant-expiry">
              Expires {new Date(grant.expiresAt * 1000).toLocaleString()} — the
              authority lapses on its own.
            </p>
          )}
          {grant.attenuations.map((cap, index) => (
            <p key={index} className="text-xs font-mono break-all">
              {cap.can} on {cap.with}
            </p>
          ))}
        </div>
      )}

      {job.status === "COMPLETE" && job.output != null && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            What the resumed job returned
          </summary>
          <pre
            data-testid="ge-resumed-output"
            className="mt-1 whitespace-pre-wrap break-all bg-muted rounded p-2 max-h-56 overflow-y-auto"
          >
            {JSON.stringify(job.output, null, 2)}
          </pre>
        </details>
      )}

      {job.status === "COMPLETE" && !grant && (
        <p className="text-xs text-muted-foreground" data-testid="ge-grant-none">
          The job resumed, but carried no capability token — the approval was
          answered without echoing the offered grant, or it was rejected.
        </p>
      )}
    </div>
  );
}
