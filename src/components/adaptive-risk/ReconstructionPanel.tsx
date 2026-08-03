"use client";

import { useCallback, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { Copy, FileSearch, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DidDisplay } from "@/components/DidDisplay";
import { useAuthStore } from "@/hooks/use-auth";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  JOBS_MD_RULE,
  RecordSummary,
  reconstructionCurl,
  signIdentityToken,
  summariseRecord,
} from "./beats";

// Beat 5. The same record, read back over plain REST — not a re-run.
//
// A job record lives in its caller's own namespace, so an anonymous GET 404s.
// The curl therefore carries a short-lived identity token, signed here in the
// browser with the user's own device key and never sent anywhere by this page.
// Without that the "paste it into your terminal" claim would simply be false.

export function ReconstructionPanel({
  venue,
  jobId,
  label,
}: {
  venue: Venue | null;
  /** The job to reconstruct — beat 3's refusal. */
  jobId: string | null;
  label: string;
}) {
  const credential = useAuthStore((state) =>
    venue ? state.authMap[venue.venueId] ?? null : null,
  );
  const signingKeyHex =
    credential?.type === "keypair" ? credential.privateKeyHex : null;

  const [record, setRecord] = useState<unknown>(null);
  const [summary, setSummary] = useState<RecordSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!venue || !jobId) return;
    setLoading(true);
    try {
      const job = await venue.jobs.get(jobId);
      setRecord(job.metadata);
      setSummary(summariseRecord(job.metadata));
      setToken(
        signingKeyHex ? signIdentityToken(signingKeyHex, venue.venueId) : null,
      );
    } catch (err) {
      notifyError("Unable to read the job record", err, venue.baseUrl);
    } finally {
      setLoading(false);
    }
  }, [venue, jobId, signingKeyHex]);

  const curl = venue ? reconstructionCurl(venue.baseUrl, jobId ?? "<job-id>", token) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      notifySuccess("Copied", { description: "Paste it into a terminal." });
    } catch (err) {
      notifyError("Unable to copy the command", err);
    }
  };

  if (!jobId) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="ar-reconstruct-none">
        Run beat 3 first — reconstruction reads back the refusal it recorded.
      </p>
    );
  }

  return (
    <div className="rounded border p-3 flex flex-col gap-3" data-testid="ar-reconstruct">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <FileSearch className="size-4 text-primary" aria-hidden="true" />
          Reconstruct {label}
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading || !venue}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Read the record
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {JOBS_MD_RULE} Nothing below runs the decision again — it reads the
        record the venue already holds.
      </p>

      {summary && (
        <div className="flex flex-col gap-1 text-xs" data-testid="ar-record-summary">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{summary.status ?? "unknown"}</Badge>
            <span className="text-muted-foreground">
              {summary.prevDepth} predecessor state
              {summary.prevDepth === 1 ? "" : "s"} on the record
            </span>
          </div>
          {summary.states.length > 0 && (
            <p className="font-mono" data-testid="ar-record-states">
              {summary.states.join(" → ")}
            </p>
          )}
          {summary.caller && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">caller</span>
              <DidDisplay value={summary.caller} />
            </div>
          )}
          {summary.actor ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">actor</span>
              <DidDisplay value={summary.actor} />
            </div>
          ) : (
            <p className="text-muted-foreground" data-testid="ar-no-actor">
              No <span className="font-mono">actor</span> field — it appears only
              when the acting principal differs from the record&apos;s owner.
            </p>
          )}
          {summary.error && (
            <pre className="whitespace-pre-wrap break-all bg-muted rounded p-2">
              {summary.error}
            </pre>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">The same record, over plain REST</p>
          <Button variant="ghost" size="sm" onClick={copy} disabled={!venue}>
            <Copy className="size-4" /> Copy
          </Button>
        </div>
        <pre
          data-testid="ar-curl"
          className="text-xs whitespace-pre-wrap break-all bg-muted rounded p-3"
        >
          {curl}
        </pre>
        {token ? (
          <p className="text-[11px] text-muted-foreground">
            Job records live in their caller&apos;s namespace, so this read carries
            your identity. The token above was signed here with your device key,
            lasts ten minutes, and is never sent anywhere by this page — treat it
            like a password until it lapses.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground" data-testid="ar-curl-no-token">
            Signed in without a device key, so no token can be minted here. Supply
            your own identity token as <span className="font-mono">COVIA_TOKEN</span>.
          </p>
        )}
      </div>

      {record != null && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            The record this page read (compare it with the curl output)
          </summary>
          <pre
            data-testid="ar-record-raw"
            className="mt-1 whitespace-pre-wrap break-all bg-muted rounded p-2 max-h-72 overflow-y-auto"
          >
            {JSON.stringify(record, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
