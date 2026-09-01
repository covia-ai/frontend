"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataAsset } from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { AssetCard } from "./AssetCard";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { PaginationHeader } from "./PaginationHeader";
import { useGridPageSize } from "@/hooks/use-grid-page-size";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useClientPagination } from "@/hooks/use-pagination";
import { CARD_GRID_CLASS } from "@/lib/grid";
import { FileStack, Search } from "lucide-react";
import { ListToolbar } from "./ListToolbar";
import { Input } from "./ui/input";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";

export function MyAssetList() {
  const {
    data: assets,
    loading: isLoading,
    error: loadError,
    run: runMyAssetsQuery,
    reset: resetMyAssetsQuery,
    invalidate: invalidateMyAssetsQuery,
  } = useLatestQuery<DataAsset[]>([], { initialLoading: true });

  const { ref: gridRef, pageSize: itemsPerPage } = useGridPageSize();
  const [searchInput, setSearchInput] = useState("");

  const resolvedVenue = useResolvedVenueContext();
  const { descriptor: venueObj, venue } = resolvedVenue;
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");

  // The a/ namespace is small (a user's own artifacts, not a venue catalog),
  // so one page-free fetch (server-capped at 1000) plus client-side
  // search/pagination keeps this consistent with AssetList's approach
  // without needing a second server-pagination code path.
  const fetchMyAssets = useCallback(() => {
    if (!venue || venueStatus !== "ready") {
      resetMyAssetsQuery();
      return Promise.resolve();
    }
    return runMyAssetsQuery(async () => {
      const result = await venue.assets.listMine();
      return result.items.map(
        (item) =>
          new DataAsset(item.id, venue, {
            name: item.name,
            description: item.description,
            type: item.type,
          }),
      );
    }, { clear: true });
  }, [venue, venueStatus, resetMyAssetsQuery, runMyAssetsQuery]);

  useEffect(() => {
    void fetchMyAssets();
    return invalidateMyAssetsQuery;
  }, [fetchMyAssets, invalidateMyAssetsQuery]);

  const pinnedRecords = usePinnedAssets((s) => s.pinned);
  const pinnedIds = useMemo(() => {
    if (!venueObj?.venueId) return new Set<string>();
    const venueId = venueObj.venueId;
    return new Set(pinnedRecords.filter((p) => p.venueId === venueId).map((p) => p.assetId));
  }, [pinnedRecords, venueObj?.venueId]);

  const filteredAssets = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    const filtered = term
      ? assets.filter(
          (a) => (a.metadata?.name ?? "").toLowerCase().includes(term) || (a.id ?? "").toLowerCase().includes(term),
        )
      : assets;
    if (pinnedIds.size === 0) return filtered;
    // Stable sort: pinned assets surface first, unpinned keep their relative order.
    return [...filtered].sort((a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id)));
  }, [assets, searchInput, pinnedIds]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
  } = useClientPagination({
    items: filteredAssets,
    pageSize: itemsPerPage,
    resetKey: searchInput,
  });

  if (venueStatus !== "ready") {
    return <VenueResolutionState status={venueStatus} error={resolvedVenue.error} icon={FileStack} subject="Your artifacts" venueId={venueObj?.venueId} />;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <ListToolbar
        actions={
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Type keyword to search…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
        }
        summary={!isLoading && `Page ${currentPage} : Showing ${pageItems.length} of ${filteredAssets.length}`}
        pagination={<PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>}
      />

      {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}

      {isLoading ? (
        <div className="flex flex-row items-center justify-center w-full h-100">
          <Spinner variant="ellipsis" className="text-primary" size={64} />
        </div>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {assets.length === 0 ? "You haven't created or pinned any assets yet." : "No artifacts match this search."}
        </p>
      ) : (
        <div ref={gridRef} className={CARD_GRID_CLASS}>
          {pageItems.map((asset) => (
            <AssetCard key={asset.id} asset={asset} type="assets" compact={true} venue={venue ?? undefined} scoped={true} />
          ))}
        </div>
      )}

      <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>
    </div>
  );
}
