"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
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

  useEffect(() => {
    const match = pathname.match(/\/venues\/([^/]+)/);
    if (match) {
      let routeVenueId = match[1];
      try {
        routeVenueId = decodeURIComponent(routeVenueId);
      } catch {
        // The route resolver will report malformed identifiers.
      }
      if (
        routeVenueId !== selectedVenueId &&
        venues.some((venue) => venue.venueId === routeVenueId)
      ) {
        selectVenue(routeVenueId);
      }
      return;
    }

    if (
      selectedVenueId &&
      venues.some((venue) => venue.venueId === selectedVenueId)
    ) {
      return;
    }
    selectVenue(venues[0]?.venueId ?? null);
  }, [pathname, venues, selectedVenueId, selectVenue]);

  return children;
}
