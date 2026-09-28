"use client";

import { useEffect, useMemo } from "react";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { getVenueFor } from "@/lib/venue-registry";
import { fetchVenueItems, type PaletteItem } from "@/lib/command-palette";

const CACHE_TTL_MS = 30_000;

type CacheEntry = { items: PaletteItem[]; fetchedAt: number };

// Module-level so results survive the palette closing and reopening — the
// dialog's "results within ~150ms" acceptance line only holds if reopening
// doesn't refetch everything from scratch.
const cache = new Map<string, CacheEntry>();

function itemsFromCache(venueIds: string[]): PaletteItem[] {
  return venueIds.flatMap((id) => cache.get(id)?.items ?? []);
}

export type CommandPaletteData = {
  items: PaletteItem[];
  refreshing: boolean;
  unreachableVenueIds: string[];
};

// What a refresh publishes: the venue set it read for, that set's items as of
// the read, and the venues that could not be reached.
type Refresh = { venueIds: string[]; items: PaletteItem[]; unreachableVenueIds: string[] };

const NO_REFRESH: Refresh = { venueIds: [], items: [], unreachableVenueIds: [] };

// Fetches every connected venue's palette catalog in parallel, lazily (only
// once `active`, i.e. the palette is actually open). Cached results render
// immediately; anything past CACHE_TTL_MS refreshes silently in the
// background without clearing what's already on screen.
export function useCommandPaletteData(active: boolean): CommandPaletteData {
  const venues = useVenues((state) => state.venues);
  const authMap = useAuthStore((state) => state.authMap);
  const venueIds = useMemo(() => venues.map((v) => v.venueId), [venues]);
  const { data: refresh, loading: refreshing, run } = useLatestQuery<Refresh>(NO_REFRESH);

  useEffect(() => {
    if (!active) return;
    const now = Date.now();
    const stale = venues.filter((v) => {
      const cached = cache.get(v.venueId);
      return !cached || now - cached.fetchedAt > CACHE_TTL_MS;
    });
    if (stale.length === 0) return;

    void run(async () => {
      const results = await Promise.allSettled(
        stale.map(async (descriptor) => {
          const auth = authMap[descriptor.venueId] ?? null;
          const venue = getVenueFor(descriptor, auth);
          const { items: venueItems, failed } = await fetchVenueItems(venue, descriptor, {
            authenticated: !!auth,
          });
          cache.set(descriptor.venueId, { items: venueItems, fetchedAt: Date.now() });
          return { venueId: descriptor.venueId, failed };
        }),
      );
      const unreachableVenueIds = results
        .map((result, i) =>
          result.status === "rejected" || result.value.failed ? stale[i].venueId : null,
        )
        .filter((id): id is string => id !== null);
      return { venueIds, items: itemsFromCache(venueIds), unreachableVenueIds };
    });
  }, [active, venues, venueIds, authMap, run]);

  // A refresh that answered for the current venue set is the freshest view;
  // otherwise the cache is, including whatever a refresh for an older set
  // left in it.
  const items = useMemo(
    () => (refresh.venueIds === venueIds ? refresh.items : itemsFromCache(venueIds)),
    [refresh, venueIds],
  );

  return { items, refreshing, unreachableVenueIds: refresh.unreachableVenueIds };
}
