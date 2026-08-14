"use client";

import { useEffect, useState } from "react";
import {
  connectDefaultVenues,
  reconcileVenues,
  useVenues,
  useVenuesHydrated,
} from "@/hooks/use-venues";
import { retireVenueIdentity } from "@/lib/venue-replacement";

export function VenueRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const selectVenue = useVenues((state) => state.selectVenue);
  const hasHydrated = useVenuesHydrated();
  const [reconciled, setReconciled] = useState(false);

  useEffect(() => {
    let active = true;
    void connectDefaultVenues().then((connected) => {
      if (!active) return;

      if (connected.length > 0) {
        let replacements: ReturnType<typeof reconcileVenues>["replaced"] = [];
        useVenues.setState((state) => {
          const result = reconcileVenues(state.venues, connected);
          replacements = result.replaced;
          const migratedSelection = replacements.find(
            (replacement) => replacement.oldId === state.selectedVenueId,
          );
          const selectedVenueId = migratedSelection
            ? migratedSelection.newId
            : result.venues.some(
                  (venue) => venue.venueId === state.selectedVenueId,
                )
              ? state.selectedVenueId
              : result.venues[0]?.venueId ?? null;
          return { venues: result.venues, selectedVenueId };
        });

        for (const replacement of replacements) {
          retireVenueIdentity(replacement);
        }
      }

      setReconciled(true);
    });

    return () => {
      active = false;
    };
  }, []);

  // Keeps the global selection valid, nothing more — venue-scoped routes
  // (/venues/<id>/...) read their own venue via useVenueForRoute without
  // touching this, so viewing a venue's page never silently reassigns what
  // "selected" means for the rest of the app (covia-ai/frontend#199).
  //
  // Gated on hydration *and* the initial default-venue reconciliation above:
  // firing against the store's pre-hydration or pre-reconciliation state
  // treats a selection that's merely not-yet-listed as gone, and persists
  // the "correction" over the user's real choice (covia-ai/frontend#209).
  useEffect(() => {
    if (!hasHydrated || !reconciled) return;
    if (
      selectedVenueId &&
      venues.some((venue) => venue.venueId === selectedVenueId)
    ) {
      return;
    }
    selectVenue(venues[0]?.venueId ?? null);
  }, [hasHydrated, reconciled, venues, selectedVenueId, selectVenue]);

  return children;
}
