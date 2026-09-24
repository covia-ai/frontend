import { useEffect, useRef, useState } from "react";
import { isJobFinished, type JobMetadata, type RunStatus } from "@covia/covia-sdk";

/** Minimal shape we need — the resolved venue's per-job SSE stream. */
interface StreamVenue {
  jobs: {
    stream: (
      jobId: string,
      options?: { signal?: AbortSignal },
    ) => AsyncGenerator<{ json: () => unknown }>;
  };
}

// Aborting — not a flag checked on the next event — is what closes a quiet
// stream: a PAUSED job may not emit anything for hours.
function closeStreams(open: Map<string, AbortController>): void {
  for (const controller of open.values()) controller.abort();
  open.clear();
}

/**
 * Live status for the active jobs on the current page. Opens one
 * `venue.jobs.stream(id)` per active job (the same auth-carrying SSE the detail
 * view uses) and returns a map of the latest streamed metadata, so active rows
 * flip the instant the venue reports a change instead of waiting for the list's
 * poll. A stream is aborted when its job reaches a terminal state, leaves the
 * active set, or the hook unmounts; if SSE is unavailable the list's existing
 * poll still updates rows.
 */
export function useActiveJobsLive(
  venue: StreamVenue | null | undefined,
  activeIds: string[],
): Record<string, JobMetadata> {
  const [live, setLive] = useState<Record<string, JobMetadata>>({});
  // A stable primitive dep: the sorted set of active ids.
  const key = [...activeIds].sort().join(",");
  // Open streams by job id. Kept across renders so a change to the active set
  // only opens and closes the streams that actually differ — each one holds a
  // connection, and browsers cap those per host.
  const streams = useRef({ venue, open: new Map<string, AbortController>() });

  useEffect(() => {
    const { open } = streams.current;
    if (streams.current.venue !== venue) {
      closeStreams(open);
      streams.current.venue = venue;
    }

    const ids = venue && key ? key.split(",") : [];
    if (!venue || ids.length === 0) {
      closeStreams(open);
      // Clear only when there's something to clear — returning the same object
      // lets React bail out, so an unstable `venue` ref can't cause a loop.
      setLive((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    for (const [id, controller] of open) {
      if (ids.includes(id)) continue;
      controller.abort();
      open.delete(id);
    }

    for (const id of ids) {
      if (open.has(id)) continue;
      const controller = new AbortController();
      open.set(id, controller);
      void (async () => {
        try {
          for await (const event of venue.jobs.stream(id, { signal: controller.signal })) {
            if (controller.signal.aborted) return;
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
          // SSE unavailable / dropped / aborted — the list's poll still refreshes this row.
        } finally {
          if (open.get(id) === controller) open.delete(id);
        }
      })();
    }
  }, [venue, key]);

  useEffect(() => {
    const { open } = streams.current;
    return () => closeStreams(open);
  }, []);

  return live;
}
