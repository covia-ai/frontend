"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { notifyError } from "@/lib/notify";

/**
 * A ledger panel's read: nothing until the first beat bumps `refreshToken`,
 * then a re-read on every bump and on a manual refresh. The snapshot is stored
 * with the venue it came from, so a venue switch shows nothing until that venue
 * has been read; a failed read is toasted and keeps the last snapshot.
 */
export function useLedgerSnapshot<T>(
  venue: Venue | null,
  refreshToken: number,
  failureTitle: string,
  read: (venue: Venue) => Promise<T>,
) {
  const { data: outcome, loading, run, invalidate } = useLatestQuery<{
    venue: Venue | null;
    snapshot: T | null;
  }>({ venue: null, snapshot: null });
  const [manualTick, setManualTick] = useState(0);

  // An Effect Event: `read` closes over the demo's addresses, and must not
  // restart the read every time the parent renders a new closure.
  const readVenue = useEffectEvent(async (target: Venue) => {
    try {
      return { venue: target, snapshot: await read(target) };
    } catch (err) {
      notifyError(failureTitle, err, target.baseUrl);
      throw err;
    }
  });

  useEffect(() => {
    if (!venue || refreshToken === 0) {
      invalidate();
      return;
    }
    const pending = readVenue(venue);
    void run(() => pending);
  }, [venue, refreshToken, manualTick, run, invalidate]);

  return {
    snapshot: outcome.venue === venue ? outcome.snapshot : null,
    loading,
    refresh: () => setManualTick((tick) => tick + 1),
  };
}
