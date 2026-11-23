"use client";

import type { AdapterInfo } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useVenueRead } from "@/hooks/use-venue-read";

/**
 * Whether the connected venue publishes a given catalog operation.
 *
 * Reads the adapter registry (`v/info/adapters`) through `venue.adapters`,
 * which is job-free — the same source the adapters page uses, and the
 * authoritative registry rather than an inference from the operations list.
 *
 * Returns `undefined` while unknown: still loading, no venue, or the read
 * failed. Callers must treat unknown as available. Blocking an action on an
 * inconclusive read is worse than letting it run and surfacing the venue's
 * own error — only a positive `false` means the venue really cannot do it.
 */
export function useVenueHasOperation(operationPath: string): boolean | undefined {
  const venue = useAuthenticatedVenue();
  const { data: adapters } = useVenueRead<AdapterInfo[] | null>({
    venue,
    initial: null,
    failureTitle: "Unable to read the adapter registry",
    // An unreadable registry is not evidence of absence — stay unknown, quietly.
    notify: false,
    load: (target) => target.adapters.list(),
  });

  // Derived from the registry read, so a change of path costs no request.
  return adapters ? adapters.some((a) => a.operations?.includes(operationPath)) : undefined;
}
