"use client";

import { useCallback } from "react";
import { DataAsset, type Venue } from "@covia/covia-sdk";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { AssetCard } from "./AssetCard";
import { Button } from "./ui/button";
import { useAssetCatalog } from "@/hooks/use-asset-catalog";
import { CARD_GRID_CLASS } from "@/lib/grid";
import { FileStack, Search } from "lucide-react";
import { ListToolbar } from "./ListToolbar";
import { Input } from "./ui/input";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";

export function MyAssetList() {
  // The a/ namespace is small (a user's own artifacts, not a venue catalog),
  // so one page-free fetch (server-capped at 1000) plus the shared client-side
  // search/pagination in useAssetCatalog keeps this consistent with AssetList
  // without a second server-pagination code path. listMine() returns
  // AssetSummary (id/name/description/type) — no keywords, so My Artifacts cards
  // carry none by design (hydrating each would be an N+1 against the one-GET rule).
  const fetchMine = useCallback(
    (venue: Venue) =>
      venue.assets.listMine().then((result) =>
        result.items.map(
          (item) =>
            new DataAsset(item.id, venue, {
              name: item.name,
              description: item.description,
              type: item.type,
            }),
        ),
      ),
    [],
  );

  const {
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
  } = useAssetCatalog({ fetchAssets: fetchMine });

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
        summary={!isLoading && `Showing ${visibleItems.length} of ${filteredAssets.length}`}
      />

      {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}

      {isLoading ? (
        <div className="flex flex-row items-center justify-center w-full h-100">
          <Spinner variant="ellipsis" className="text-primary" size={64} />
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {assets.length === 0 ? "You haven't created or pinned any assets yet." : "No artifacts match this search."}
        </p>
      ) : (
        <>
          <div className={CARD_GRID_CLASS}>
            {visibleItems.map((asset) => (
              <AssetCard key={asset.id} asset={asset} type="assets" compact={true} venue={venue ?? undefined} scoped={true} />
            ))}
          </div>

          {/* Infinite scroll: the sentinel reveals the next batch; the button is
              a manual fallback (and covers no-IntersectionObserver envs). */}
          <div className="flex w-full items-center justify-center py-6">
            {hasMore ? (
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={loadMore}>
                Load more assets
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">End of results</span>
            )}
            <div ref={sentinelRef} className="h-px w-px" aria-hidden />
          </div>
        </>
      )}
    </div>
  );
}
