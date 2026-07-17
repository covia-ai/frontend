"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useAuthStore } from "@/hooks/use-auth";
import { getVenueFor } from "@/hooks/use-authenticated-venue";

// Resolves an authenticated Venue instance for `routeVenueId` (or the
// globally selected venue if omitted). Composes useVenueForRoute (find in
// store, or Venue.connect + addVenue) with getVenueFor (cached instance per
// (venue, auth), auth looked up per-venue rather than globally) — the two
// pieces every venue-scoped detail page needs, previously hand-rolled with
// slight variations in AssetViewer/ExecutionViewer/OperationViewer/McpToolsList.
export function useResolvedVenue(routeVenueId?: string): Venue | undefined {
  const venueObj = useVenueForRoute(routeVenueId);
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);

  return useMemo(() => {
    if (!venueObj) return undefined;
    return getVenueFor(venueObj, getAuthForVenue(venueObj.venueId));
  }, [venueObj, authMap, getAuthForVenue]);
}
