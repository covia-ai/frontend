"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from "react";

import { Asset, DataAsset }from "@covia/covia-sdk";
import { getAssetKind } from "@/lib/asset-kind";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { PaginationHeader } from "./PaginationHeader";
import { useGridPageSize } from "@/hooks/use-grid-page-size";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useClientPagination } from "@/hooks/use-pagination";
import { CARD_GRID_CLASS } from "@/lib/grid";
import { FileKey, Search }from "lucide-react";
import { CreateAssetComponent } from "./CreateAssetComponent";
import { TopBar } from "./admin-panel/TopBar";
import { FiltersSheet } from "./FiltersSheet";
import { ListToolbar } from "./ListToolbar";
import { Input } from "./ui/input";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";


interface AssetListProps {
  venueId?: string;
}

export function AssetList({ venueId }: AssetListProps = {}) {
  const searchParams = useSearchParams()
  const {
    data: assetsMetadata,
    loading: isLoading,
    error: loadError,
    run: runAssetQuery,
    reset: resetAssetQuery,
    invalidate: invalidateAssetQuery,
  } = useLatestQuery<Asset[]>([], { initialLoading: true });
  const router = useRouter();

  // Page size follows the grid: columns it renders, times rows that fit in the
  // space below it, so both a wider and a taller window show more assets.
  const { ref: gridRef, pageSize: itemsPerPage } = useGridPageSize();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? "");
  const pathname = usePathname();

  const resolvedVenue = useResolvedVenueContext(venueId);
  const {
    descriptor: venueObj,
    venue,
    isAuthenticated,
  } = resolvedVenue;
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  }
  // Shared by the initial-load effect and the create-asset refresh; isStale
  // drops in-flight results after venue change or unmount, so stale assets
  // never land in the fresh list. Fetches the full id list unconditionally —
  // search text only filters client-side (see filteredAssets) so typing
  // never triggers a refetch. expand: 'metadata' inlines every item's
  // metadata into the one listing call, so there's no per-id hydration pass.
  const fetchAssets = useCallback(() => {
    if (!venue || venueStatus !== "ready") {
      resetAssetQuery();
      return Promise.resolve();
    }
    return runAssetQuery(
      async () => {
        const assetList = await venue.listAssets({ expand: "metadata" });
        return assetList.items
          // venue.listAssets() is a hash-only CAS scan (GET /api/v1/assets) —
          // it has no path field, so anything catalog-owned that ends up
          // here can only be shown at a bare /a/<hash>, which misdisplays
          // venue-catalog content as the caller's own pinned asset (covia#390).
          // Operations, agent templates, and skills are catalog content with
          // their own path-first views (Operations, Skills), so they're
          // excluded here rather than given an invented catalog address;
          // what's left is genuinely CAS-only content, correctly hash-addressed.
          .filter((e) => {
            if (e.metadata.name == undefined) return false;
            const kind = getAssetKind(e.metadata);
            return kind !== "operation" && kind !== "agent-template" && kind !== "skill";
          })
          .map((e) => new DataAsset(e.id, venue, e.metadata));
      },
      { clear: true },
    );
  }, [venue, venueStatus, resetAssetQuery, runAssetQuery]);

  useEffect(() => {
    void fetchAssets();
    return invalidateAssetQuery;
  }, [fetchAssets, invalidateAssetQuery]);

  const keywordOptions = useMemo(() => {
    const all = assetsMetadata.flatMap(a => Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : []);
    return [...new Set(all)].sort();
  }, [assetsMetadata]);

  const tagOptions = useMemo(
    () => keywordOptions.map((k) => ({ value: k, label: k, groupTag: "Keyword" })),
    [keywordOptions],
  );

  const pinnedRecords = usePinnedAssets((s) => s.pinned);
  const pinnedIds = useMemo(() => {
    if (!venueObj?.venueId) return new Set<string>();
    const venueId = venueObj.venueId;
    return new Set(pinnedRecords.filter((p) => p.venueId === venueId).map((p) => p.assetId));
  }, [pinnedRecords, venueObj?.venueId]);

  const filteredAssets = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    const filtered = assetsMetadata.filter(a => {
      if (selectedTags.length > 0) {
        const keywords: string[] = Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : [];
        if (!selectedTags.some(tag => keywords.includes(tag))) return false;
      }
      if (!term) return true;
      return (a.metadata?.name ?? "").toLowerCase().includes(term) || (a.id ?? "").toLowerCase().includes(term);
    });
    if (pinnedIds.size === 0) return filtered;
    // Stable sort: pinned assets surface first, unpinned keep their relative order.
    return [...filtered].sort((a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id)));
  }, [assetsMetadata, selectedTags, searchInput, pinnedIds]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
  } = useClientPagination({
    items: filteredAssets,
    pageSize: itemsPerPage,
    resetKey: `${searchInput}\u0000${selectedTags.join("\u0000")}`,
  });

  if (venueStatus !== "ready") {
     return (
      <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name} />
        <VenueResolutionState
          status={venueStatus}
          error={resolvedVenue.error}
          icon={FileKey}
          subject="Assets"
          venueId={venueId}
        />
      </ContentLayout>
     )
  }

  return (
    <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name}/>
  
        <div className="flex flex-col items-center justify-center">
          <ListToolbar
            className="mt-4"
            actions={
              <>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Type keyword to search…"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {isAuthenticated && (
                  <CreateAssetComponent venue={venue ?? undefined}></CreateAssetComponent>
                )}
                <FiltersSheet
                  title="Filter Assets"
                  description="Narrow down assets by tag."
                  groups={tagOptions.length > 0 ? [{ label: "Tags", options: tagOptions, selected: selectedTags, onChange: setSelectedTags }] : []}
                />
              </>
            }
            summary={!isLoading && `Page ${currentPage} : Showing ${pageItems.length} of ${filteredAssets.length}`}
            pagination={<PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>}
          />

          {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}

          {isLoading ? (
            <div className="flex flex-row items-center justify-center w-full h-100">
              <Spinner variant="ellipsis" className="text-primary" size={64}/>
            </div>
          ) : (
            <div ref={gridRef} className={CARD_GRID_CLASS}>
              {pageItems.map((asset) =>
                <AssetCard key={asset.id} asset={asset} type="assets" compact={true} venue={venue ?? undefined} scoped={!!venueId}/>
              )}
            </div>
          )}

          <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>

        </div>
      </ContentLayout>
  );
}
