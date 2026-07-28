"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  connectDefaultVenues,
  reconcileVenues,
  useVenues,
} from "@/hooks/use-venues";
import { evictVenueInstances } from "@/hooks/use-authenticated-venue";

export function VenueRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const selectVenue = useVenues((state) => state.selectVenue);

  useEffect(() => {
    let active = true;
    void connectDefaultVenues().then((connected) => {
      if (!active || connected.length === 0) return;

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
        evictVenueInstances(replacement.oldId);
        toast.warning(`Venue at ${replacement.baseUrl} has a new identity`, {
          description:
            `${replacement.name ?? "The venue"} restarted with a fresh DID. ` +
            "Sign-ins, agents and secrets from its previous run no longer apply.",
          duration: 15000,
          closeButton: true,
        });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Keeps the global selection valid, nothing more — venue-scoped routes
  // (/venues/<id>/...) read their own venue via useVenueForRoute without
  // touching this, so viewing a venue's page never silently reassigns what
  // "selected" means for the rest of the app (covia-ai/frontend#199).
  useEffect(() => {
    if (
      selectedVenueId &&
      venues.some((venue) => venue.venueId === selectedVenueId)
    ) {
      return;
    }
    selectVenue(venues[0]?.venueId ?? null);
  }, [venues, selectedVenueId, selectVenue]);

  return children;
}
