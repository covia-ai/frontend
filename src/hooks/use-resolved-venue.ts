"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import {
  getVenueFor,
  useValidateVenue,
} from "@/hooks/use-authenticated-venue";
import { useVenueAccess } from "@/hooks/use-venue-access";
import type { VenueDescriptor } from "@/hooks/use-venues";

// Resolves an authenticated Venue instance for `routeVenueId` (or the
// globally selected venue if omitted). Composes useVenueForRoute (find in
// store, or Venue.connect + addVenue) with getVenueFor (cached instance per
// (venue, auth), auth looked up per-venue rather than globally) — the two
// pieces every venue-scoped detail page needs, previously hand-rolled with
// slight variations in AssetViewer/ExecutionViewer/OperationViewer/McpToolsList.
//
// "ready" means more than "the venue address resolved" — it means read
// access is actually confirmed (the venue is public, or the stored account
// was accepted). A private venue with no/rejected credentials resolves its
// identity fine (via the did.json fallback, see Venue.connect) but reports
// "auth-required" instead of "ready", so callers gate fetches on this status
// rather than firing a doomed, 401-bound request against a private venue.
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
  useValidateVenue(venue, authData);

  const access = useVenueAccess(venue?.baseUrl, venueDescriptor?.venueId);
  const status: ResolvedVenueContext["status"] =
    resolution.status !== "ready" ? resolution.status
    : access.state === "connected" || access.state === "public" ? "ready"
    : access.state === "unreachable" ? "unreachable"
    : access.state === "signed-out" || access.state === "auth-rejected" || access.state === "auth-unverified" ? "auth-required"
    // "connecting" / "auth-checking" / "unknown": access isn't confirmed yet,
    // but no definitive verdict either — keep showing the connecting state
    // rather than flashing a sign-in prompt that may resolve to "ready" a
    // moment later.
    : "connecting";

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
