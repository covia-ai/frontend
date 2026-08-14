import { useVenues, type VenueReplacement } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { evictVenueInstances } from "@/lib/venue-registry";
import { notifyWarning } from "@/lib/notify";

// A venue restarted with a fresh DID is a NEW trust context: cached SDK
// instances for the old identity mint tokens the venue rejects ("Token
// audience not accepted"), and its credentials can never be valid again.

/** Drop everything scoped to a dead venue identity and tell the user why. */
export function retireVenueIdentity(replacement: VenueReplacement): void {
  evictVenueInstances(replacement.oldId);
  useAuthStore.getState().purgeVenueAuth(replacement.oldId);
  notifyWarning(`Venue at ${replacement.baseUrl} has a new identity`, {
    description:
      `${replacement.name ?? "The venue"} restarted with a fresh DID. ` +
      "Sign-ins, agents and secrets from its previous run no longer apply.",
    duration: 15000,
    closeButton: true,
  });
}

/**
 * Swap a venue's stored identity for the one its address now reports —
 * migrating the selection — then retire the dead identity. Used when
 * error-driven revalidation discovers a restarted venue mid-session (the
 * startup reconciliation only covers venues live at app load).
 */
export function applyVenueReplacement(replacement: VenueReplacement): void {
  let applied = false;
  useVenues.setState((state) => {
    if (!state.venues.some((venue) => venue.venueId === replacement.oldId)) {
      return state; // already replaced (concurrent failures race here)
    }
    applied = true;
    const withoutOld = state.venues.filter(
      (venue) => venue.venueId !== replacement.oldId,
    );
    const venues = withoutOld.some((venue) => venue.venueId === replacement.newId)
      ? withoutOld
      : [
          ...withoutOld,
          {
            venueId: replacement.newId,
            baseUrl: replacement.baseUrl,
            metadata: { name: replacement.name },
          },
        ];
    return {
      venues,
      selectedVenueId:
        state.selectedVenueId === replacement.oldId
          ? replacement.newId
          : state.selectedVenueId,
    };
  });
  if (applied) retireVenueIdentity(replacement);
}
