"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from "react";

import { DataAsset, type Venue }from "@covia/covia-sdk";
import { getAssetKind } from "@/lib/asset-kind";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { useAssetCatalog } from "@/hooks/use-asset-catalog";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // venue.listAssets() is a hash-only CAS scan (GET /api/v1/assets) — it has no
  // path field, so anything catalog-owned that ends up here can only be shown at
  // a bare /a/<hash>, which misdisplays venue-catalog content as the caller's
  // own pinned asset (covia#390). Operations, agent templates, and skills are
  // catalog content with their own path-first views, so they're excluded here;
  // what's left is genuinely CAS-only content, correctly hash-addressed.
  // expand: 'metadata' inlines every item's metadata into the one listing call,
  // so there's no per-id hydration pass.
  const fetchCatalog = useCallback(
    (venue: Venue) =>
      venue.listAssets({ expand: "metadata" }).then((assetList) =>
        assetList.items
          .filter((e) => {
            if (e.metadata.name == undefined) return false;
            const kind = getAssetKind(e.metadata);
            return kind !== "operation" && kind !== "agent-template" && kind !== "skill";
          })
          .map((e) => new DataAsset(e.id, venue, e.metadata)),
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
    pageItems,
    currentPage,
    setCurrentPage,
    totalPages,
    gridRef,
  } = useAssetCatalog({
    venueId,
    fetchAssets: fetchCatalog,
    initialSearch: searchParams.get("search") ?? "",
    selectedTags,
  });
  const isAuthenticated = resolvedVenue.isAuthenticated;

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  };

  const keywordOptions = useMemo(() => {
    const all = assets.flatMap((a) => (Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : []));
    return [...new Set(all)].sort();
  }, [assets]);
  const tagOptions = useMemo(
    () => keywordOptions.map((k) => ({ value: k, label: k, groupTag: "Keyword" })),
    [keywordOptions],
  );

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
