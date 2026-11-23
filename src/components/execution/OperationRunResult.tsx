"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RunStatus } from "@covia/covia-sdk";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { ExecutionDataTable } from "@/components/execution/ExecutionDataTable";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { useExecutionLifecycle } from "@/hooks/use-execution-lifecycle";
import { TONE_STYLES } from "@/lib/status";
import { cn } from "@/lib/utils";

interface OperationRunResultProps {
  jobId: string;
  venueId: string;
  /** When set, render a link to the full job page (the receipt/timeline).
   *  Omitted by the Playground, which has no per-op job route to point at. */
  jobHref?: string;
}

/**
 * The inline result of running an operation — status, a live "streaming" pill,
 * and the typed output — driven by the shared job lifecycle hook (SSE with a
 * polling fallback). Extracted from the Playground so the operation detail
 * page's run-in-place view shows results identically, and adds an opt-in link
 * out to the full job (its receipt and timeline) for callers that have one.
 */
export function OperationRunResult({ jobId, venueId, jobHref }: OperationRunResultProps) {
  const { job, operationAsset, loading, error, notFound, streaming } = useExecutionLifecycle({
    jobId,
    venueId,
  });

  if (loading) {
    return (
      <div className="flex h-32 w-full items-center justify-center">
        <Spinner variant="ellipsis" className="text-primary" size={32} />
      </div>
    );
  }
  if (error) return <ErrorDisplay error={error} />;
  // The lifecycle hook nulls `error` for a missing job and reports `notFound`
  // instead. Falling through to `!job` would leave the caller's always-rendered
  // result panel empty, with no status and no explanation.
  if (notFound) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="operation-run-not-found">
        This job is no longer available on the venue.
      </p>
    );
  }
  if (!job) return null;

  const operationSchema = operationAsset?.metadata?.operation;

  return (
    <div className="space-y-4" data-testid="operation-run-result">
      <div className="flex items-center gap-3">
        <StatusBadge status={job.status} kind="job" />
        {streaming && (
          <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", TONE_STYLES.active.pill)}>
            <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", TONE_STYLES.active.dot)} />
            Streaming
          </span>
        )}
        {jobHref && (
          <Link
            href={jobHref}
            data-testid="operation-run-job-link"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"
          >
            View full job &amp; receipt <ArrowUpRight size={13} />
          </Link>
        )}
      </div>

      {job.status === RunStatus.FAILED && job.error ? (
        <ErrorDisplay error={job.error} />
      ) : (
        <ExecutionDataTable value={job.output} schema={operationSchema?.output} direction="output" />
      )}
    </div>
  );
}
