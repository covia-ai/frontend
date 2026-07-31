"use client";

import { useEffect, useRef } from "react";
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
// added to the venues list, mirroring AdaptersList's resolution.
export function useVenueForRoute(routeVenueId?: string): VenueDescriptor | null {
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
        reportVenueHealth(v.baseUrl, { state: "connected", version: v.lastKnownStatus?.version });
        addVenue(toVenueDescriptor(v));
      })
      .catch((err: unknown) => {
        failed.current.add(attemptKey);
        const detail = err instanceof Error ? err.message : String(err);
        reportVenueHealth(identifier, { state: "unreachable", detail });
        notifyError("Unable to connect to venue", err, identifier);
      })
      .finally(() => {
        connecting.current.delete(routeVenueId);
      });
  }, [routeVenueId, found, addVenue, getAuthForVenue, authMap, attemptKey]);

  if (!routeVenueId) return globalVenueObj ?? null;
  return found ?? null;
}
