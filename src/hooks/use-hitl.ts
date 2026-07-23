"use client";

import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { listHitlRequests, type HitlRequest } from "@/lib/hitl";

// How often the shared poller re-checks the inbox, so a request that arrives
// while the app is open still surfaces. Every read is a job-free values GET,
// so polling costs no Jobs.
const HITL_POLL_MS = 30_000;

// In-memory count of requests awaiting this user, written by whichever surface
// last read the inbox — the layout poller, or the inbox page itself — and read
// by every indicator. Keeping it in one store means adding another indicator
// never adds another poll, and answering a request updates the badge at once.
type HitlCountStore = {
  openCount: number;
  setOpenCount: (openCount: number) => void;
};

const useHitlCountStore = create<HitlCountStore>((set) => ({
  openCount: 0,
  setOpenCount: (openCount) => set({ openCount }),
}));

function publishOpenCount(requests: HitlRequest[]): void {
  useHitlCountStore
    .getState()
    .setOpenCount(requests.filter((r) => r.status === "open").length);
}

/** The shared open-request count. Read-only — this does not poll. */
export function useHitlOpenCount(): number {
  return useHitlCountStore((s) => s.openCount);
}

/**
 * Owns the single background poll behind every HITL indicator. Mounted once,
 * in the admin layout — indicators read the store instead of fetching for
 * themselves.
 */
export function useHitlOpenCountPoll(): void {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (!venue || !isAuthenticated) {
      useHitlCountStore.getState().setOpenCount(0);
      return;
    }
    let ignore = false;
    const load = () =>
      listHitlRequests(venue)
        .then((list) => { if (!ignore) publishOpenCount(list); })
        .catch(() => {});

    load();
    const id = setInterval(load, HITL_POLL_MS);
    return () => { ignore = true; clearInterval(id); };
  }, [venue, isAuthenticated]);
}

/** The signed-in user's HITL inbox, newest first. */
export function useHitlRequests() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const [requests, setRequests] = useState<HitlRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (!venue || !isAuthenticated) {
      setRequests([]);
      setLoading(false);
      return;
    }
    let ignore = false;
    setLoading(true);
    listHitlRequests(venue)
      .then((list) => {
        if (ignore) return;
        setRequests(list);
        // The page has the freshest view of the inbox — publish it so the
        // indicators drop the moment a request is answered, without waiting
        // for the next poll.
        publishOpenCount(list);
      })
      .catch(() => { if (!ignore) setRequests([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [venue, isAuthenticated, refreshTick]);

  return { requests, loading, refresh };
}
