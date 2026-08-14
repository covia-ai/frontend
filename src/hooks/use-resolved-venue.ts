"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useVenueAccess } from "@/hooks/use-venue-access";
import type { VenueDescriptor } from "@/hooks/use-venues";

// Resolves an authenticated Venue instance for `routeVenueId` (or the
// globally selected venue if omitted). Composes useVenueForRoute (find in
// store, or Venue.connect + addVenue) with getVenueFor (cached instance per
// (venue, auth), auth looked up per-venue rather than globally) — the two
// pieces every venue-scoped detail page needs, previously hand-rolled with
// slight variations in AssetViewer/ExecutionViewer/OperationViewer/McpToolsList.
//
// Resolution is optimistic: a venue whose address and DID are already known
// reports "ready" immediately and pages fire their reads without waiting for
// any status round trip — normal pages do not validate venues at all. Only a
// DEFINITIVE negative verdict (unreachable, auth rejected/required) blocks;
// those verdicts come from the venue picker's health indicators or from
// revalidateVenueOnFailure when a page read actually fails.
export type ResolvedVenueContext = {
  descriptor: VenueDescriptor | null;
  venue: Venue | undefined;
  auth: VenueAuth | null;
  isAuthenticated: boolean;
  status: "absent" | "connecting" | "ready" | "unreachable" | "auth-required";
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

  const access = useVenueAccess(venue?.baseUrl, venueDescriptor?.venueId);
  const status: ResolvedVenueContext["status"] =
    resolution.status !== "ready" ? resolution.status
    : access.state === "unreachable" ? "unreachable"
    : access.state === "signed-out" || access.state === "auth-rejected" ? "auth-required"
    // No definitive negative verdict — treat the venue as usable and let
    // pages read immediately. A failed read triggers a status refresh
    // (revalidateVenueOnFailure), which flips this to unreachable /
    // auth-required only once a real failure confirms it.
    : "ready";

  return {
    descriptor: venueDescriptor,
    venue,
    auth: authData,
    isAuthenticated: authData !== null,
    status,
    error: resolution.error,
  };
}

export function useResolvedVenue(routeVenueId?: string): Venue | undefined {
  return useResolvedVenueContext(routeVenueId).venue;
}
