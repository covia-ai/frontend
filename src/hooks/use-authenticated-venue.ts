"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { createAuthProvider } from "@/lib/auth-provider";
import { reportVenueHealth } from "@/hooks/use-venue-health";

// One shared Venue instance per (venue, auth). The SDK accumulates
// per-instance state (asset cache, capability detection), which a fresh
// instance per component or render would throw away. Instances are created
// lazily on first use, and the connection is validated by a background
// status() — never blocking navigation on a dead venue (f503fc8).
const venueCache = new Map<string, Venue>();

// Drop every cached instance for a venueId — called when reconciliation
// discovers the venue behind an id no longer exists (e.g. restarted with a
// fresh identity), so stale instances can't keep signing JWTs for a dead
// audience or serving its cached state.
export function evictVenueInstances(venueId: string): void {
  for (const key of venueCache.keys()) {
    if (key.startsWith(`${venueId}|`)) venueCache.delete(key);
  }
}

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
    // Background validation doubles as a liveness probe for the health store.
    venue.status()
      .then((s) => reportVenueHealth(venue!.baseUrl, { state: "connected", version: (s as any)?.version }))
      .catch((err: any) => reportVenueHealth(venue!.baseUrl, { state: "unreachable", detail: err?.message ?? String(err) }));
  }
  return venue;
}

export function useAuthenticatedVenue(): Venue | null {
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const authData = useAuthStore((x) =>
    venueObj ? x.authMap[venueObj.venueId] ?? null : null
  );

  return useMemo(() => {
    if (!venueObj) return null;
    return getVenueFor(venueObj, authData);
  }, [venueObj, authData]);
}
