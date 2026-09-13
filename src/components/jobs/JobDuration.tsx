import { type JobMetadata } from "@covia/covia-sdk";
import { cn, getExecutionTime } from "@/lib/utils";
import { jobDurationMs, durationFillClass } from "@/lib/job-visuals";

/**
 * Latency as a value plus an indicator, shared by the Jobs list row and the Job
 * detail view. A terminal job shows a colour-graded latency indicator; a running
 * job shows just its elapsed time so far — the "it's live" signal is carried
 * once (the row's Live dot / the detail's Streaming pill), not duplicated here.
 *
 * `compact` (detail MetaTile) uses a small colour dot instead of the list's
 * `maxMs`-scaled bar, so the two surfaces share one component without the detail
 * gaining a full-width bar.
 */
export function JobDuration({
  job,
  maxMs,
  isTerminal,
  compact = false,
}: {
  job: JobMetadata;
  maxMs: number;
  isTerminal: boolean;
  compact?: boolean;
}) {
  if (!isTerminal) {
    return job.created ? (
      <span className="text-xs italic text-muted-foreground">
        {getExecutionTime(job.created, new Date().toISOString())} so far
      </span>
    ) : (
      <span className="text-muted-foreground">{compact ? "running" : "--"}</span>
    );
  }
  const ms = jobDurationMs(job);
  if (ms == null) return <span className="text-muted-foreground">{compact ? "—" : "--"}</span>;
  if (compact) {
    return (
      <span className="flex items-center gap-2" title={`${ms} ms`}>
        <span className={cn("inline-block size-2 rounded-full", durationFillClass(ms))} />
        {getExecutionTime(job.created ?? "", job.updated ?? "")}
      </span>
    );
  }
  const pct = maxMs > 0 ? Math.max(6, Math.round((ms / maxMs) * 100)) : 100;
  return (
    <div className="flex items-center gap-2" title={`${ms} ms`}>
      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", durationFillClass(ms))} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {getExecutionTime(job.created ?? "", job.updated ?? "")}
      </span>
    </div>
  );
}
