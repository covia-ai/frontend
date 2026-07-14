"use client";

import { useEffect, useRef } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { createAuthProvider } from "@/lib/auth-provider";

// Resolves the venue a page should read from. When `routeVenueId` is given
// (e.g. the [slug] segment of /venues/[slug]/assets), that venue is always
// used, even if it differs from whichever venue is globally selected —
// otherwise a venue-scoped route could silently render a different venue's
// data. Falls back to the globally selected venue only when no
// `routeVenueId` is given (e.g. the unscoped /assets, /operations, /jobs
// pages). If the route's venue isn't already known, it's connected to and
// added to the venues list, mirroring AdaptersList's resolution.
export function useVenueForRoute(routeVenueId?: string): Venue | null {
  const globalVenueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const { venues, addVenue } = useVenues();
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);
  const connecting = useRef<string | null>(null);

  const found = routeVenueId ? venues.find((v) => v.venueId === routeVenueId) : undefined;

  useEffect(() => {
    if (!routeVenueId || found || connecting.current === routeVenueId) return;
    connecting.current = routeVenueId;
    const authOption = createAuthProvider(getAuthForVenue(routeVenueId));
    Venue.connect(decodeURIComponent(routeVenueId), authOption).then((v) => {
      addVenue(v);
    }).finally(() => {
      connecting.current = null;
    });
  }, [routeVenueId, found, addVenue, getAuthForVenue, authMap]);

  if (!routeVenueId) return globalVenueObj;
  return found ?? null;
}
