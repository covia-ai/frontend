"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Job, Venue } from "@covia/covia-sdk";
import { ExternalLink, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { notifyError } from "@/lib/notify";
import { verbatimVenueError } from "./seeding";

/** The narration a beat renders. Demos define their own beat lists. */
export type DemoBeat = { id: string; title: string; narration: string; watch: string };

// One beat: narration, a Run button, then the real job record. A failed call
// renders as a failure with the venue's error string verbatim — never
// paraphrased (deliberately not friendlyError), never animated over.

const POLL_MS = 1000;

export type BeatJobState = {
  jobId: string | null;
  status: string | null;
  error: string | null;
  output: unknown;
};

export function BeatCard({
  beat,
  venue,
  enabled,
  disabledHint,
  run,
  onSettled,
  children,
}: {
  beat: DemoBeat;
  venue: Venue | null;
  enabled: boolean;
  disabledHint?: string;
  /** Starts the beat's real job. Absent = beat not wired yet (renders narration only). */
  run?: (venue: Venue) => Promise<Job>;
  /** Called once the job reaches a terminal state. */
  onSettled?: (state: BeatJobState) => void;
  children?: React.ReactNode;
}) {
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState<BeatJobState | null>(null);
  // Ownership guard against overlapping runs and unmount, per the
  // use-execution-lifecycle idiom.
  const generation = useRef(0);
  useEffect(() => () => void (generation.current += 1), []);

  const start = async () => {
    if (!venue || !run) return;
    const gen = ++generation.current;
    const owns = () => generation.current === gen;
    setRunning(true);
    setJob(null);
    try {
      const started = await run(venue);
      if (!owns()) return;
      setJob({ jobId: started.id, status: started.metadata?.status ?? null, error: null, output: null });
      // A job parked awaiting a human (INPUT_REQUIRED) is NOT finished, but it
      // is settled as far as this beat is concerned — the next move is the
      // person's. Polling until isFinished would spin forever and leave the
      // Run button disabled for as long as the ask goes unanswered.
      const settledEnough = () => started.isFinished || started.isPaused;
      while (!settledEnough()) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (!owns()) return;
        await started.refresh();
        if (!owns()) return;
        setJob({
          jobId: started.id,
          status: started.metadata?.status ?? null,
          error: started.metadata?.error ?? null,
          output: null,
        });
      }
      const settled: BeatJobState = {
        jobId: started.id,
        status: started.metadata?.status ?? null,
        error: started.metadata?.error ?? null,
        output: started.isComplete ? started.output : null,
      };
      setJob(settled);
      onSettled?.(settled);
    } catch (err) {
      if (!owns()) return;
      // An invoke refused before a job existed still gets shown, verbatim.
      const settled: BeatJobState = {
        jobId: job?.jobId ?? null,
        status: "FAILED",
        error: verbatimVenueError(err),
        output: null,
      };
      setJob(settled);
      onSettled?.(settled);
      notifyError(`Unable to run ${beat.title}`, err, venue.baseUrl);
    } finally {
      if (owns()) setRunning(false);
    }
  };

  return (
    <li data-testid={`beat-${beat.id}`} className="rounded-lg border p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{beat.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{beat.narration}</p>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-medium text-foreground">Watch:</span> {beat.watch}
          </p>
        </div>
        {run && (
          <Button
            size="sm"
            data-testid={`run-${beat.id}`}
            onClick={start}
            disabled={!enabled || running}
          >
            {running ? <Spinner variant="ellipsis" /> : <PlayCircle className="size-4" />}
            Run
          </Button>
        )}
      </div>
      {run && !enabled && disabledHint && (
        <p className="text-xs text-muted-foreground" data-testid={`hint-${beat.id}`}>
          {disabledHint}
        </p>
      )}

      {job && (
        <div className="rounded border bg-muted/30 p-3 flex flex-col gap-2" data-testid={`job-${beat.id}`}>
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge status={job.status ?? undefined} kind="job" as="pill" />
            {job.jobId && (
              <>
                <Badge variant="outline" className="font-mono text-[11px]">{job.jobId}</Badge>
                {venue && (
                  <Link
                    className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                    data-testid={`job-link-${beat.id}`}
                    href={`/venues/${encodeURIComponent(venue.venueId)}/jobs/${job.jobId}`}
                  >
                    open in Jobs <ExternalLink className="size-3" />
                  </Link>
                )}
              </>
            )}
          </div>
          {job.error && (
            <pre
              data-testid={`error-${beat.id}`}
              className="text-xs text-destructive whitespace-pre-wrap break-all bg-muted rounded p-2"
            >
              {job.error}
            </pre>
          )}
          {job.output != null && (
            <pre
              data-testid={`output-${beat.id}`}
              className="text-xs whitespace-pre-wrap break-all bg-muted rounded p-2 max-h-56 overflow-y-auto"
            >
              {JSON.stringify(job.output, null, 2)}
            </pre>
          )}
        </div>
      )}
      {children}
    </li>
  );
}
