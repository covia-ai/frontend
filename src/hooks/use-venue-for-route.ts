"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectWithTimeout,
  toVenueDescriptor,
  useVenues,
  type VenueDescriptor,
} from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { createAuthProvider } from "@/lib/auth-provider";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { notifyError } from "@/lib/notify";

// Resolves the venue a page should read from. When `routeVenueId` is given
// (e.g. the [slug] segment of /venues/[slug]/assets), that venue is always
// used, even if it differs from whichever venue is globally selected —
// otherwise a venue-scoped route could silently render a different venue's
// data. Falls back to the globally selected venue only when no
// `routeVenueId` is given (e.g. the unscoped /assets, /operations, /jobs
// pages). If the route's venue isn't already known, it's connected to and
// added to the venues list, mirroring AdaptersList's resolution. Returning an
// explicit state keeps callers from rendering "no venues" while a routed
// venue is still connecting, or from silently going blank after it fails.
export type VenueResolution = {
  descriptor: VenueDescriptor | null;
  status: "absent" | "connecting" | "ready" | "unreachable";
  error: string | null;
};

export function useVenueForRoute(routeVenueId?: string): VenueResolution {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const addVenue = useVenues((state) => state.addVenue);
  const globalVenueObj = venues.find(
    (venue) => venue.venueId === selectedVenueId,
  );
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);
  const connecting = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const [failedAttempt, setFailedAttempt] = useState<{
    key: string;
    error: string;
  } | null>(null);

  const found = routeVenueId ? venues.find((v) => v.venueId === routeVenueId) : undefined;
  const authData = routeVenueId ? authMap[routeVenueId] : undefined;
  const attemptKey = `${routeVenueId ?? ""}:${JSON.stringify(authData ?? null)}`;

  useEffect(() => {
    if (!routeVenueId || found || connecting.current.has(routeVenueId) || failed.current.has(attemptKey)) return;
    connecting.current.add(routeVenueId);
    const authOption = createAuthProvider(getAuthForVenue(routeVenueId));
    let identifier = routeVenueId;
    try { identifier = decodeURIComponent(routeVenueId); } catch { /* connect will surface the invalid id */ }
    reportVenueHealth(identifier, { state: "connecting" });
    connectWithTimeout(identifier, authOption, 10_000)
      .then((v) => {
        reportVenueHealth(v.baseUrl, {
          state: "connected",
          version: v.lastKnownStatus?.version,
          publicAccess: authData ? undefined : v.lastKnownStatus !== undefined,
        });
        addVenue(toVenueDescriptor(v));
      })
      .catch((err: unknown) => {
        failed.current.add(attemptKey);
        const detail = err instanceof Error ? err.message : String(err);
        setFailedAttempt({ key: attemptKey, error: detail });
        reportVenueHealth(identifier, { state: "unreachable", detail });
        notifyError("Unable to connect to venue", err, identifier);
      })
      .finally(() => {
        connecting.current.delete(routeVenueId);
      });
  }, [routeVenueId, found, addVenue, getAuthForVenue, authMap, authData, attemptKey]);

  if (!routeVenueId) {
    return {
      descriptor: globalVenueObj ?? null,
      status: globalVenueObj ? "ready" : "absent",
      error: null,
    };
  }
  if (found) return { descriptor: found, status: "ready", error: null };
  if (failedAttempt?.key === attemptKey) {
    return {
      descriptor: null,
      status: "unreachable",
      error: failedAttempt.error,
    };
  }
  return { descriptor: null, status: "connecting", error: null };
}
