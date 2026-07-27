"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from "react";

import { Asset, DataAsset }from "@covia/covia-sdk";
import { loadAssetEntries } from "@/lib/asset-metadata";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { useVenues } from "@/hooks/use-venues";
import { useGridPageSize } from "@/hooks/use-grid-page-size";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useClientPagination } from "@/hooks/use-pagination";
import { CARD_GRID_CLASS } from "@/lib/grid";
import { FileKey, Lock }from "lucide-react";
import { CreateAssetComponent } from "./CreateAssetComponent";
import { TopBar } from "./admin-panel/TopBar";
import { FiltersSheet } from "./FiltersSheet";
import { Button } from "./ui/button";
import { ErrorDisplay } from "@/components/ErrorDisplay";


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

  const { venues } = useVenues();
  const {
    descriptor: venueObj,
    venue,
    isAuthenticated,
  } = useResolvedVenueContext(venueId);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  }
  // Shared by the initial-load effect and the create-asset refresh; isStale
  // drops in-flight results after venue change or unmount, so stale assets
  // never land in the fresh list. Fetches the full id list unconditionally —
  // search text only filters client-side (see filteredAssets) so typing
  // never triggers a refetch. Metadata resolves through the content-addressed
  // cache (immutable, so revisits are near-free) and streams in per batch,
  // so the grid fills incrementally instead of blocking on the slowest of
  // N individual GETs.
  const fetchAssets = useCallback(() => {
    if (!venue) {
      resetAssetQuery();
      return Promise.resolve();
    }
    return runAssetQuery(
      async (publish) => {
        const assetList = await venue.listAssets();
        const toDataAssets = (entries: Awaited<ReturnType<typeof loadAssetEntries>>) =>
          entries
            // Everything except operations (which have their own page) is an
            // artifact here — skills and agent templates included.
            .filter((e) => e.metadata.name != undefined && e.metadata.operation == undefined)
            .map((e) => new DataAsset(e.id, venue, e.metadata));
        const entries = await loadAssetEntries(
          venue,
          assetList.items,
          (progress) => publish(toDataAssets(progress), { loading: false }),
        );
        return toDataAssets(entries);
      },
      { clear: true },
    );
  }, [venue, resetAssetQuery, runAssetQuery]);

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

  const filteredAssets = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return assetsMetadata.filter(a => {
      if (selectedTags.length > 0) {
        const keywords: string[] = Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : [];
        if (!selectedTags.some(tag => keywords.includes(tag))) return false;
      }
      if (!term) return true;
      return (a.metadata?.name ?? "").toLowerCase().includes(term) || (a.id ?? "").toLowerCase().includes(term);
    });
  }, [assetsMetadata, selectedTags, searchInput]);

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

  if(venues.length == 0 ) {
     return (
      <ContentLayout>
      <TopBar venueName={venueObj?.metadata.name}/>

      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4 justify-end">
          <FiltersSheet
            title="Filter Assets"
            description="Search and narrow down assets by tag."
            search={{ value: searchInput, onChange: handleSearchChange, placeholder: "Type keyword to search…" }}
            groups={[]}
          />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
            <FileKey size={64} className="text-primary"></FileKey>
            <div className="text-primary text-lg">Get Started with Assets</div>
            <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available assets</div>

        </div>
      </ContentLayout>
     )
  }

  function handleDataFromChild(_status: boolean) {
    void fetchAssets();
  }

  return (
    <ContentLayout>
        <TopBar venueName={venueObj?.metadata.name}/>
  
        <div className="flex flex-col items-center justify-center">
          <div className="flex gap-2 items-center w-full mt-4 justify-end">
            {isAuthenticated ? (
              <CreateAssetComponent sendDataToParent={handleDataFromChild} venue={venue ?? undefined}></CreateAssetComponent>
            ) : (
              <Button variant="outline" disabled className="gap-2 text-muted-foreground">
                <Lock size={14} />
                Sign in to create assets
              </Button>
            )}
            <FiltersSheet
              title="Filter Assets"
              description="Search and narrow down assets by tag."
              search={{ value: searchInput, onChange: handleSearchChange, placeholder: "Type keyword to search…" }}
              groups={tagOptions.length > 0 ? [{ label: "Tags", options: tagOptions, selected: selectedTags, onChange: setSelectedTags }] : []}
            />
          </div>

          <div className="flex flex-row flex-nowrap items-center justify-between w-full my-2 gap-4">
            <div className="text-card-foreground text-xs whitespace-nowrap">
              {!isLoading && `Page ${currentPage} : Showing ${pageItems.length} of ${filteredAssets.length}`}
            </div>
            <div className="shrink-0">
              <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>
            </div>
          </div>

          {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}

          {isLoading ? (
            <div className="flex flex-row items-center justify-center w-full h-100">
              <Spinner variant="ellipsis" className="text-primary" size={64}/>
            </div>
          ) : (
            <div ref={gridRef} className={CARD_GRID_CLASS}>
              {pageItems.map((asset) =>
                <AssetCard key={asset.id} asset={asset} type="assets" compact={true} venue={venue ?? undefined} authenticated={isAuthenticated}/>
              )}
            </div>
          )}

          <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>

        </div>
      </ContentLayout>
  );
}
