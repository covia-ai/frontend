"use client";

import { useEffect, useState } from "react";
import type { AdapterInfo } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";

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
  const [has, setHas] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!venue) {
      setHas(undefined);
      return;
    }
    let ignore = false;
    setHas(undefined);
    venue.adapters
      .list()
      .then((adapters: AdapterInfo[]) => {
        if (ignore) return;
        setHas(adapters.some((a) => a.operations?.includes(operationPath)));
      })
      // An unreadable registry is not evidence of absence — stay unknown.
      .catch(() => { if (!ignore) setHas(undefined); });
    return () => { ignore = true; };
  }, [venue, operationPath]);

  return has;
}
