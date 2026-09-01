"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
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
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!venue || !isAuthenticated) {
      setCount(0);
      return;
    }
    let ignore = false;
    venue.secrets
      .list()
      .then((names) => {
        if (ignore) return;
        const present = new Set(Array.isArray(names) ? names : []);
        setCount(CONNECTIONS.filter((c) => present.has(c.secretName)).length);
      })
      .catch(() => {
        if (!ignore) setCount(0);
      });
    return () => {
      ignore = true;
    };
  }, [venue, isAuthenticated]);

  return count;
}
