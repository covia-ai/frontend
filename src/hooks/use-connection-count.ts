"use client";

import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useVenueRead } from "@/hooks/use-venue-read";
import { CONNECTIONS } from "@/config/connections";

/**
 * How many catalogue services are connected — a connection is just a stored
 * secret named after the service, so this counts CONNECTIONS whose secret is
 * present. Reads `secrets.list()` (a REST GET, no Job) once per venue; the
 * Connections page is where connect/disconnect happens and re-navigating
 * refreshes this, so it does not poll.
 */
export function useConnectionCount(): number {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const { data: count } = useVenueRead<number>({
    venue,
    enabled: isAuthenticated,
    initial: 0,
    failureTitle: "Unable to count connections",
    // A sidebar badge, not a page: a failed read shows no count, without a toast.
    notify: false,
    load: async (target) => {
      const names = await target.secrets.list();
      const present = new Set(Array.isArray(names) ? names : []);
      return CONNECTIONS.filter((c) => present.has(c.secretName)).length;
    },
  });
  return count;
}
