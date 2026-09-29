"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { errorMessage } from "@/lib/errors";
import { notifyError } from "@/lib/notify";

type VenueReadOptions<T> = {
  venue: Venue | null | undefined;
  /**
   * The auth `venue` was built with — a failed read re-probes with it. Omit it
   * to use the account stored for `venue`, which is what useAuthenticatedVenue
   * built the instance from; pass it when the caller already holds it (a page
   * reading through useResolvedVenueContext).
   */
  auth?: VenueAuth | null;
  /** False while the read must not run (e.g. signed out). Default true. */
  enabled?: boolean;
  initial: T;
  failureTitle: string;
  /**
   * False for a read whose failure has its own quiet fallback — a badge count
   * that simply shows nothing — rather than a toast. Default true.
   */
  notify?: boolean;
  load: (venue: Venue) => Promise<T>;
};

/**
 * One venue-scoped page read, with the three things every list page needs and
 * used to hand-roll slightly differently: latest-wins (a slow reply from the
 * previous venue cannot land on this one), an `error` that is distinct from
 * "loaded, and empty", and a venue status recheck on failure so
 * resolution-gated pages converge on unreachable / auth-required.
 *
 * `load` may be an inline closure: only `venue`, `enabled` and `reload()`
 * trigger a read.
 */
export function useVenueRead<T>({
  venue,
  auth,
  enabled = true,
  initial,
  failureTitle,
  notify = true,
  load,
}: VenueReadOptions<T>) {
  const storedAuth = useAuthStore((state) =>
    venue ? state.authMap[venue.venueId] ?? null : null,
  );
  const effectiveAuth = auth === undefined ? storedAuth : auth;
  // The placeholder is fixed on the first render: callers pass a fresh literal
  // each time, and the outcome has to compare against one stable value.
  const [initialValue] = useState(() => initial);
  // The outcome is stored with the venue it came from, so neither rows nor an
  // error can show under another venue's name — not even for the render between
  // a venue switch and the effect that starts the new read.
  const { data: outcome, loading, run, invalidate } = useLatestQuery<{
    venue: Venue | null;
    value: T;
    error: string | null;
  }>({ venue: null, value: initialValue, error: null });
  const [reloadTick, setReloadTick] = useState(0);

  // An Effect Event sees the current `load`, auth and title when it is called
  // without making them dependencies, so an inline `load` closure does not
  // restart the read on every render.
  const read = useEffectEvent(async (target: Venue) => {
    try {
      return { venue: target, value: await load(target), error: null };
    } catch (cause) {
      if (notify) notifyError(failureTitle, cause, target.baseUrl);
      revalidateVenueOnFailure(target, effectiveAuth, cause);
      return { venue: target, value: initialValue, error: errorMessage(cause, failureTitle) };
    }
  });

  useEffect(() => {
    if (!venue || !enabled) {
      invalidate();
      return;
    }
    const pending = read(venue);
    void run(() => pending);
  }, [venue, enabled, reloadTick, run, invalidate]);

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), []);

  const wanted = !!venue && enabled;
  const settled = wanted && outcome.venue === venue;
  return {
    data: settled ? outcome.value : initialValue,
    // Wanted but not settled counts as loading, so a page never flashes its
    // empty state before the first read has even started.
    loading: wanted && (loading || !settled),
    error: settled ? outcome.error : null,
    reload,
  };
}
