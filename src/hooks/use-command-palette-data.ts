"use client";

import { useEffect, useState } from "react";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
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

// Fetches every connected venue's palette catalog in parallel, lazily (only
// once `active`, i.e. the palette is actually open). Cached results render
// immediately; anything past CACHE_TTL_MS refreshes silently in the
// background without clearing what's already on screen.
export function useCommandPaletteData(active: boolean): CommandPaletteData {
  const venues = useVenues((state) => state.venues);
  const authMap = useAuthStore((state) => state.authMap);
  const [items, setItems] = useState<PaletteItem[]>(() =>
    itemsFromCache(venues.map((v) => v.venueId)),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [unreachableVenueIds, setUnreachableVenueIds] = useState<string[]>([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const venueIds = venues.map((v) => v.venueId);
    setItems(itemsFromCache(venueIds));

    const now = Date.now();
    const stale = venues.filter((v) => {
      const cached = cache.get(v.venueId);
      return !cached || now - cached.fetchedAt > CACHE_TTL_MS;
    });
    if (stale.length === 0) return;

    setRefreshing(true);
    Promise.allSettled(
      stale.map(async (descriptor) => {
        const auth = authMap[descriptor.venueId] ?? null;
        const venue = getVenueFor(descriptor, auth);
        const { items: venueItems, failed } = await fetchVenueItems(venue, descriptor, {
          authenticated: !!auth,
        });
        cache.set(descriptor.venueId, { items: venueItems, fetchedAt: Date.now() });
        return { venueId: descriptor.venueId, failed };
      }),
    ).then((results) => {
      if (cancelled) return;
      const unreachable = results
        .map((result, i) =>
          result.status === "rejected" || result.value.failed ? stale[i].venueId : null,
        )
        .filter((id): id is string => id !== null);
      setItems(itemsFromCache(venueIds));
      setUnreachableVenueIds(unreachable);
      setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [active, venues, authMap]);

  return { items, refreshing, unreachableVenueIds };
}
