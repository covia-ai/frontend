"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataAsset, Venue } from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { useLatestQuery } from "@/hooks/use-latest-query";

// How many cards to reveal per infinite-scroll step. The whole catalogue is
// already in memory (one job-free read per venue), so growing the window is a
// pure client-side slice — no refetch. Mirrors OperationsList / JobList so every
// catalogue in the app scrolls the same way rather than paging.
const BATCH_SIZE = 24;

interface UseAssetCatalogArgs {
  /** Venue to resolve; omit to use the globally-selected venue (My Artifacts). */
  venueId?: string;
  /** Fetch the asset list for a ready venue. MUST be a stable reference
   *  (wrap in useCallback) or the load effect will loop. */
  fetchAssets: (venue: Venue) => Promise<DataAsset[]>;
  /** Seed the search box (e.g. from a `?search=` param). */
  initialSearch?: string;
  /** Extra tag/keyword AND-any filter (AssetList's FiltersSheet); [] = none. */
  selectedTags?: string[];
}

// The shared state machine behind both artifact lists (AssetList / MyAssetList),
// which were near-duplicates: one job-free fetch into `useLatestQuery`, client-
// side search + optional tag filter, pinned-first stable sort, and infinite
// scroll. The two list components now differ only in their fetcher, chrome, and
// toolbar; everything else lives here (W3 R-3).
export function useAssetCatalog({
  venueId,
  fetchAssets,
  initialSearch = "",
  selectedTags = [],
}: UseAssetCatalogArgs) {
  const {
    data: assets,
    loading: isLoading,
    error: loadError,
    run,
    reset,
    invalidate,
  } = useLatestQuery<DataAsset[]>([], { initialLoading: true });

  const [searchInput, setSearchInput] = useState(initialSearch);

  const resolvedVenue = useResolvedVenueContext(venueId);
  const { descriptor: venueObj, venue } = resolvedVenue;
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");

  const load = useCallback(() => {
    if (!venue || venueStatus !== "ready") {
      reset();
      return Promise.resolve();
    }
    return run(() => fetchAssets(venue), { clear: true });
  }, [venue, venueStatus, reset, run, fetchAssets]);

  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);

  const pinnedRecords = usePinnedAssets((s) => s.pinned);
  const pinnedIds = useMemo(() => {
    if (!venueObj?.venueId) return new Set<string>();
    const id = venueObj.venueId;
    return new Set(pinnedRecords.filter((p) => p.venueId === id).map((p) => p.assetId));
  }, [pinnedRecords, venueObj?.venueId]);

  // A stable primitive key for the tag list (order-sensitive) so the memo and
  // the window reset only when the actual selection changes.
  const tagKey = JSON.stringify(selectedTags);
  const filteredAssets = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    const filtered = assets.filter((a) => {
      if (selectedTags.length > 0) {
        const keywords: string[] = Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : [];
        if (!selectedTags.some((tag) => keywords.includes(tag))) return false;
      }
      if (!term) return true;
      return (
        (a.metadata?.name ?? "").toLowerCase().includes(term) ||
        (a.id ?? "").toLowerCase().includes(term)
      );
    });
    if (pinnedIds.size === 0) return filtered;
    // Stable sort: pinned assets surface first, unpinned keep their relative order.
    return [...filtered].sort((a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id)));
    // selectedTags is captured via the stable tagKey dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, searchInput, tagKey, pinnedIds]);

  // Infinite scroll: how many of the (filtered) cards are shown. Growing the
  // window is a client-side slice; search/filter always apply to the full list.
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Set the moment a grow is requested; cleared once the new slice renders, so a
  // burst of intersection events can't stack multiple batches at once.
  const growingRef = useRef(false);

  // Reset to the first batch whenever the filtered set changes (search / tags),
  // so a narrowed list starts from the top.
  const resetKey = `${searchInput} ${tagKey}`;
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [resetKey]);

  const visibleItems = useMemo(() => filteredAssets.slice(0, visibleCount), [filteredAssets, visibleCount]);
  const hasMore = visibleCount < filteredAssets.length;

  const loadMore = useCallback(() => {
    if (growingRef.current) return;
    growingRef.current = true;
    setVisibleCount((v) => v + BATCH_SIZE);
  }, []);

  useEffect(() => {
    growingRef.current = false;
  }, [visibleItems.length]);

  // Grow when the sentinel scrolls into view. Guarded on hasMore and re-armed on
  // every slice change so each batch triggers the next; the manual "Load more"
  // button covers environments without IntersectionObserver (e.g. jsdom).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, visibleItems.length]);

  return {
    assets,
    isLoading,
    loadError,
    resolvedVenue,
    venue,
    venueObj,
    venueStatus,
    searchInput,
    setSearchInput,
    filteredAssets,
    visibleItems,
    hasMore,
    loadMore,
    sentinelRef,
  };
}
