"use client";

import { memo, useMemo } from "react";
import { JobMetadata, RunStatus } from "@covia/covia-sdk";
import { Copy } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { JobRowActions } from "@/components/jobs/JobRowActions";
import { JobDuration } from "@/components/jobs/JobDuration";
import { TONE_STYLES, toneForRunStatus } from "@/lib/status";
import { operationVisual, abbreviateJobId } from "@/lib/job-visuals";
import { TERMINAL_STATUSES } from "@/lib/job-history";
import { cn, formatDateTime } from "@/lib/utils";

const ACTIVE_STATUSES = new Set([RunStatus.PENDING, RunStatus.STARTED, RunStatus.PAUSED]);

export interface JobRowProps {
  job: JobMetadata;
  /** The live-stream overlay for this job (liveJobs[id]) or undefined. Kept as a
   *  distinct prop so `memo` re-renders only the row whose live data changed. */
  live?: JobMetadata;
  /** The resolved `operation.adapter` for the icon — a stable string (not the
   *  resolver), so props stay referentially stable for `memo`. */
  adapter?: string;
  maxMs: number;
  variant: "table" | "card";
  onOpen: (job: JobMetadata) => void;
  onChanged: () => void;
}

// The copyable, abbreviated job id — the same affordance on desktop and mobile
// (mobile used to render a plain, non-copyable span). stopPropagation so copying
// doesn't also open the row's detail drawer.
function CopyableId({ id, className }: { id?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (id) navigator.clipboard?.writeText(id); }}
      title={`${id ?? ""} — click to copy`}
      className={cn(
        "group inline-flex items-center gap-1 rounded font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      {abbreviateJobId(id)}
      <Copy size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function JobRowInner({ job, live, adapter, maxMs, variant, onOpen, onChanged }: JobRowProps) {
  const eff = live ? { ...job, ...live } : job;
  const isTerminal = TERMINAL_STATUSES.has(eff.status as RunStatus);
  const tone = toneForRunStatus(eff.status);
  const isLive = !!live && ACTIVE_STATUSES.has(eff.status as RunStatus);
  const rowTint =
    tone === "failure" ? TONE_STYLES.failure.surface
    : tone === "attention" ? TONE_STYLES.attention.surface
    : "";
  // Adapter-resolved icon on BOTH layouts (mobile previously called
  // operationVisual(job) with no adapter, so hash-op jobs showed a generic tile).
  const { Icon, className: opClass } = useMemo(() => operationVisual(job, adapter), [job, adapter]);
  const liveDot = isLive
    ? <span className={cn("size-1.5 shrink-0 animate-pulse rounded-full", TONE_STYLES.active.dot)} title="Live" />
    : null;
  const name = job.name ?? "Operation";

  if (variant === "table") {
    return (
      <TableRow className={cn("cursor-pointer", rowTint)} onClick={() => onOpen(job)}>
        <TableCell>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", opClass)}>
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{name}</div>
              <CopyableId id={job.id} className="mt-0.5" />
            </div>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {job.created ? formatDateTime(job.created) : "--"}
        </TableCell>
        <TableCell>
          <JobDuration job={eff} maxMs={maxMs} isTerminal={isTerminal} />
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center gap-1.5">
            {liveDot}
            <StatusBadge status={eff.status} kind="job" />
          </span>
        </TableCell>
        <TableCell className="text-right">
          <JobRowActions job={job} onChanged={onChanged} />
        </TableCell>
      </TableRow>
    );
  }

  const openJob = () => onOpen(job);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openJob}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openJob(); } }}
      className={cn("flex w-full cursor-pointer items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50", rowTint)}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", opClass)}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">{name}</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
            {liveDot}
            <StatusBadge status={eff.status} kind="job" />
          </span>
          <JobRowActions job={job} onChanged={onChanged} />
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <CopyableId id={job.id} />
          <span aria-hidden>·</span>
          <span className="truncate">{job.created ? formatDateTime(job.created) : "--"}</span>
        </div>
        <JobDuration job={eff} maxMs={maxMs} isTerminal={isTerminal} />
      </div>
    </div>
  );
}

// Memoised: a 5s poll that changes one live job re-renders only that row (in each
// layout), not the whole list twice.
export const JobRow = memo(JobRowInner);
