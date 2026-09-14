"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataAsset, Venue } from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { useGridPageSize } from "@/hooks/use-grid-page-size";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useClientPagination } from "@/hooks/use-pagination";

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
// which were near-duplicates: one job-free fetch into `useLatestQuery`, grid-
// derived page size, client-side search + optional tag filter, pinned-first
// stable sort, and client pagination. The two list components now differ only
// in their fetcher, chrome, and toolbar; everything else lives here (W3 R-3).
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

  const { ref: gridRef, pageSize: itemsPerPage } = useGridPageSize();
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
  // pagination reset only when the actual selection changes.
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

  const { currentPage, setCurrentPage, totalPages, pageItems } = useClientPagination({
    items: filteredAssets,
    pageSize: itemsPerPage,
    resetKey: `${searchInput} ${tagKey}`,
  });

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
    pageItems,
    currentPage,
    setCurrentPage,
    totalPages,
    gridRef,
  };
}
