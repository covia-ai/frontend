"use client";

import type { JobMetadata } from "@covia/covia-sdk";
import { DidDisplay } from "@/components/DidDisplay";
import { cn, formatDateTime } from "@/lib/utils";
import { stateHistory, statusVisual } from "@/lib/job-visuals";

/**
 * A job's state-history timeline, reconstructed from its `prev` chain: each
 * transition (PENDING → STARTED → COMPLETE/FAILED …) with its timestamp and the
 * actor that recorded it. Oldest-first, read-only, built from the record the
 * detail view already holds — no extra fetch. The actor is shown only when it
 * changes, to keep a single-caller job uncluttered.
 */
export function JobStateTimeline({ job }: { job: JobMetadata }) {
  const steps = stateHistory(job);
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">No state history was recorded.</p>;
  }

  return (
    <ol className="space-y-0" data-testid="job-state-timeline">
      {steps.map((step, i) => {
        const { Icon, spin, textClass, label } = statusVisual(step.status);
        const isLast = i === steps.length - 1;
        const showActor = !!step.actor && step.actor !== steps[i - 1]?.actor;
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && <span className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden />}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background",
                textClass,
              )}
            >
              <Icon size={13} className={cn(spin && "animate-spin")} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={cn("text-sm font-medium", textClass)}>{label}</span>
                {step.at != null && (
                  <span className="text-xs text-muted-foreground">{formatDateTime(step.at)}</span>
                )}
              </div>
              {showActor && step.actor && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>by</span>
                  <DidDisplay value={step.actor} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
