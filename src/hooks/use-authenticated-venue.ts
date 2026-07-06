"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { createAuthProvider } from "@/lib/auth-provider";

// One shared Venue instance per (venue, auth). The SDK accumulates
// per-instance state (asset cache, capability detection), which a fresh
// instance per component or render would throw away. Instances are created
// lazily on first use, and the connection is validated by a background
// status() — never blocking navigation on a dead venue (f503fc8).
const venueCache = new Map<string, Venue>();

export function getVenueFor(
  venueObj: { baseUrl?: string; venueId?: string; metadata?: { name?: string } },
  authData: VenueAuth | null,
): Venue {
  const key = `${venueObj.venueId ?? venueObj.baseUrl}|${JSON.stringify(authData ?? null)}`;
  let venue = venueCache.get(key);
  if (!venue) {
    venue = new Venue({
      baseUrl: venueObj.baseUrl,
      venueId: venueObj.venueId,
      name: venueObj.metadata?.name,
      auth: createAuthProvider(authData),
    });
    venueCache.set(key, venue);
    venue.status().catch(() => { /* unreachable venue — surface on first real use */ });
  }
  return venue;
}

export function useAuthenticatedVenue(): Venue | null {
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);

  return useMemo(() => {
    if (!venueObj) return null;
    return getVenueFor(venueObj, getAuthForVenue(venueObj.venueId));
  }, [venueObj, authMap, getAuthForVenue]);
}
