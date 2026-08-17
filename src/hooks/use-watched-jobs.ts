"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { getVenueFor } from "@/lib/venue-registry";
import { notifySuccess, notifyError } from "@/lib/notify";

// How often the shared poller re-checks watched jobs. Only ticks while the
// watch list is non-empty (mirrors JobList's "only poll when there are
// active jobs" discipline) — GET /api/v1/jobs/{id} is a job-free read, so
// this costs no Jobs, but there's no reason to run it idle.
const WATCH_POLL_MS = 5_000;

// Small and self-pruning (terminal jobs are unwatched immediately), but
// capped in case a venue/auth lookup keeps failing for some entry.
const MAX_WATCHED_JOBS = 50;

export type WatchedJob = { venueId: string; jobId: string; addedAt: number };

type WatchedJobsState = {
  jobs: WatchedJob[];
  watch: (venueId: string, jobId: string) => void;
  unwatch: (venueId: string, jobId: string) => void;
};

// Persisted (not just in-memory) so a job started right before closing the
// tab is still watched on reopen — the whole point of #241's ambient
// tracking is catching completion even after navigating away.
export const useWatchedJobs = create<WatchedJobsState>()(
  persist(
    (set) => ({
      jobs: [],
      watch: (venueId, jobId) =>
        set((state) => {
          if (state.jobs.some((j) => j.venueId === venueId && j.jobId === jobId)) return state;
          return {
            jobs: [...state.jobs, { venueId, jobId, addedAt: Date.now() }].slice(-MAX_WATCHED_JOBS),
          };
        }),
      unwatch: (venueId, jobId) =>
        set((state) => ({
          jobs: state.jobs.filter((j) => !(j.venueId === venueId && j.jobId === jobId)),
        })),
    }),
    {
      name: "watched-jobs",
      storage: createJSONStorage(browserStorage),
    },
  ),
);

function jobReceiptHref(venueId: string, jobId: string): string {
  return `/venues/${encodeURIComponent(venueId)}/jobs/${jobId}`;
}

/**
 * Owns the single background poll behind ambient job-completion
 * notifications (#241) — mounted once, alongside useHitlOpenCountPoll, in
 * the admin layout. There's no venue-wide job SSE stream to subscribe to
 * (the SDK only offers per-job venue.jobs.stream), so this generalizes the
 * same "one shared poller feeds a store" shape instead.
 *
 * Jobs join the watch list at the one choke point every job-producing
 * action already passes through: useJobExecution().execute() (on success,
 * right before it navigates to the job's own page).
 */
export function useWatchedJobsPoll(): void {
  const jobs = useWatchedJobs((s) => s.jobs);

  useEffect(() => {
    if (jobs.length === 0) return;

    let ignore = false;
    const check = async () => {
      for (const { venueId, jobId } of jobs) {
        if (ignore) return;
        const descriptor = useVenues.getState().venues.find((v) => v.venueId === venueId);
        if (!descriptor) {
          // The venue was removed from this browser entirely — nothing left
          // to check against, so stop tracking rather than fail forever.
          useWatchedJobs.getState().unwatch(venueId, jobId);
          continue;
        }
        try {
          const authData = useAuthStore.getState().authMap[venueId] ?? null;
          const venue = getVenueFor(descriptor, authData);
          const job = await venue.jobs.get(jobId);
          if (ignore || !job.isFinished) continue;

          const label = job.metadata.name ?? jobId;
          const receiptHref = jobReceiptHref(venueId, jobId);
          if (job.isComplete) {
            notifySuccess(`Job complete: ${label}`, {
              description: descriptor.metadata.name,
              receiptHref,
            });
          } else {
            notifyError(
              `Job ${(job.metadata.status ?? "failed").toLowerCase()}: ${label}`,
              job.metadata.error ? new Error(job.metadata.error) : undefined,
              undefined,
              receiptHref,
            );
          }
          useWatchedJobs.getState().unwatch(venueId, jobId);
        } catch (err: unknown) {
          // Quiet like the HITL poller — a transient read failure here just
          // means we check again next tick, not a user-facing error.
          console.warn(`Watched-job poll failed for ${jobId}:`, err);
        }
      }
    };

    check();
    const id = setInterval(check, WATCH_POLL_MS);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [jobs]);
}
