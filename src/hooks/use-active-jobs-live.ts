import { useEffect, useState } from "react";
import { isJobFinished, type JobMetadata, type RunStatus } from "@covia/covia-sdk";

/** Minimal shape we need — the resolved venue's per-job SSE stream. */
interface StreamVenue {
  jobs: { stream: (jobId: string) => AsyncGenerator<{ json: () => unknown }> };
}

/**
 * Live status for the active jobs on the current page. Opens one
 * `venue.jobs.stream(id)` per active job (the same auth-carrying SSE the detail
 * view uses) and returns a map of the latest streamed metadata, so active rows
 * flip the instant the venue reports a change instead of waiting for the list's
 * poll. Streams close when a job reaches a terminal state or the active set
 * changes; if SSE is unavailable the list's existing poll still updates rows.
 */
export function useActiveJobsLive(
  venue: StreamVenue | null | undefined,
  activeIds: string[],
): Record<string, JobMetadata> {
  const [live, setLive] = useState<Record<string, JobMetadata>>({});
  // A stable primitive dep: the sorted set of active ids.
  const key = [...activeIds].sort().join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!venue || ids.length === 0) {
      // Clear only when there's something to clear — returning the same object
      // lets React bail out, so an unstable `venue` ref can't cause a loop.
      setLive((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    let cancelled = false;

    for (const id of ids) {
      void (async () => {
        try {
          for await (const event of venue.jobs.stream(id)) {
            if (cancelled) return;
            let meta: JobMetadata | undefined;
            try {
              const data = event.json() as { metadata?: JobMetadata } & JobMetadata;
              meta = (data?.metadata ?? data) as JobMetadata;
            } catch {
              continue; // malformed event — a later one can still recover
            }
            if (!meta) continue;
            setLive((prev) => ({ ...prev, [id]: meta as JobMetadata }));
            if (meta.status && isJobFinished(meta.status as RunStatus)) return; // terminal → close
          }
        } catch {
          // SSE unavailable / dropped — the list's poll still refreshes this row.
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [venue, key]);

  return live;
}
