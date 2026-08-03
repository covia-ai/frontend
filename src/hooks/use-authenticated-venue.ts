"use client";

import { useEffect, useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { useVenues, type VenueDescriptor } from "@/hooks/use-venues";
import { createAuthProvider } from "@/lib/auth-provider";
import { reportVenueHealth } from "@/hooks/use-venue-health";

// One shared Venue instance per (venue, auth). The SDK accumulates
// per-instance state (asset cache, capability detection), which a fresh
// instance per component or render would throw away. Instances are created
// lazily on first use, and the connection is validated by a background
// status() — never blocking navigation on a dead venue (f503fc8).
type CachedVenue = {
  descriptor: VenueDescriptor;
  auth: VenueAuth | null;
  venue: Venue;
};

const venueCache = new Map<string, CachedVenue>();

// Drop every cached instance for a venueId — called when reconciliation
// discovers the venue behind an id no longer exists (e.g. restarted with a
// fresh identity), so stale instances can't keep signing JWTs for a dead
// audience or serving its cached state.
export function evictVenueInstances(venueId: string): void {
  venueCache.delete(venueId);
}

export function getVenueFor(
  venueObj: VenueDescriptor,
  authData: VenueAuth | null,
): Venue {
  const cached = venueCache.get(venueObj.venueId);
  if (
    cached &&
    cached.auth === authData &&
    cached.descriptor.baseUrl === venueObj.baseUrl
  ) {
    return cached.venue;
  }

  const venue = new Venue({
      baseUrl: venueObj.baseUrl,
      venueId: venueObj.venueId,
      name: venueObj.metadata?.name,
      auth: createAuthProvider(authData),
  });
  venueCache.set(venueObj.venueId, {
    descriptor: venueObj,
    auth: authData,
    venue,
  });
  return venue;
}

const validatedVenues = new WeakSet<Venue>();
export function useValidateVenue(venue: Venue | null | undefined): void {
  useEffect(() => {
    if (!venue || validatedVenues.has(venue)) return;
    validatedVenues.add(venue);
    let active = true;
    void venue
      .status()
      .then((status) => {
        if (active) {
          reportVenueHealth(venue.baseUrl, {
            state: "connected",
            version: status?.version,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          reportVenueHealth(venue.baseUrl, {
            state: "unreachable",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [venue]);
}

export function useAuthenticatedVenue(): Venue | null {
  const venueObj = useVenues((state) =>
    state.venues.find((venue) => venue.venueId === state.selectedVenueId),
  );
  const authData = useAuthStore((x) =>
    venueObj ? x.authMap[venueObj.venueId] ?? null : null
  );

  const venue = useMemo(() => {
    if (!venueObj) return null;
    return getVenueFor(venueObj, authData);
  }, [venueObj, authData]);
  useValidateVenue(venue);
  return venue;
}
