"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import {
  getVenueFor,
  useValidateVenue,
} from "@/hooks/use-authenticated-venue";
import type { VenueDescriptor } from "@/hooks/use-venues";

// Resolves an authenticated Venue instance for `routeVenueId` (or the
// globally selected venue if omitted). Composes useVenueForRoute (find in
// store, or Venue.connect + addVenue) with getVenueFor (cached instance per
// (venue, auth), auth looked up per-venue rather than globally) — the two
// pieces every venue-scoped detail page needs, previously hand-rolled with
// slight variations in AssetViewer/ExecutionViewer/OperationViewer/McpToolsList.
export type ResolvedVenueContext = {
  descriptor: VenueDescriptor | null;
  venue: Venue | undefined;
  auth: VenueAuth | null;
  isAuthenticated: boolean;
  status: "absent" | "connecting" | "ready" | "unreachable";
  error: string | null;
};

export function useResolvedVenueContext(
  routeVenueId?: string,
): ResolvedVenueContext {
  const resolution = useVenueForRoute(routeVenueId);
  const venueDescriptor = resolution.descriptor;
  const authData = useAuthStore((x) =>
    venueDescriptor ? x.authMap[venueDescriptor.venueId] ?? null : null
  );

  const venue = useMemo(() => {
    if (!venueDescriptor) return undefined;
    return getVenueFor(venueDescriptor, authData);
  }, [venueDescriptor, authData]);
  useValidateVenue(venue);

  return {
    descriptor: venueDescriptor,
    venue,
    auth: authData,
    isAuthenticated: authData !== null,
    status: resolution.status,
    error: resolution.error,
  };
}

export function useResolvedVenue(routeVenueId?: string): Venue | undefined {
  return useResolvedVenueContext(routeVenueId).venue;
}
