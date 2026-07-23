"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { listHitlRequests, type HitlRequest } from "@/lib/hitl";

// The sidebar badge polls so a request that arrives while the app is open still
// surfaces. Every read is a job-free values GET, so this costs no Jobs.
const HITL_POLL_MS = 30_000;

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
      .then((list) => { if (!ignore) setRequests(list); })
      .catch(() => { if (!ignore) setRequests([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [venue, isAuthenticated, refreshTick]);

  return { requests, loading, refresh };
}

/** Count of requests still awaiting this user — drives the sidebar badge. */
export function useHitlOpenCount(): number {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!venue || !isAuthenticated) {
      setCount(0);
      return;
    }
    let ignore = false;
    const load = () =>
      listHitlRequests(venue)
        .then((list) => {
          if (!ignore) setCount(list.filter((r) => r.status === "open").length);
        })
        .catch(() => {});

    load();
    const id = setInterval(load, HITL_POLL_MS);
    return () => { ignore = true; clearInterval(id); };
  }, [venue, isAuthenticated]);

  return count;
}
