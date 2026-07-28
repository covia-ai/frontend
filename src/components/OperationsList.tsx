"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Asset, Operation }from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { useVenues } from "@/hooks/use-venues";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { PlayCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { useGridPageSize } from "@/hooks/use-grid-page-size";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useClientPagination } from "@/hooks/use-pagination";
import { CARD_GRID_CLASS } from "@/lib/grid";
import { FiltersSheet } from "./FiltersSheet";
import { ListToolbar } from "./ListToolbar";
import { ErrorDisplay } from "@/components/ErrorDisplay";

interface OperationsListProps {
  venueId?: string;
}

export function OperationsList({ venueId }: OperationsListProps = {}) {
  const searchParams = useSearchParams()
  const {
    data: assetsMetadata,
    loading: isLoading,
    error: loadError,
    run: runOperationsQuery,
    reset: resetOperationsQuery,
    invalidate: invalidateOperationsQuery,
  } = useLatestQuery<Asset[]>([], { initialLoading: true });
  const router = useRouter();

  // A fixed 12 wasted whatever the window actually offered — three rows on a
  // wide screen, two on a very wide one, and no more on a tall one. Size the
  // page from the grid itself: columns it renders, times rows that fit below.
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
  // Bumped by the refresh control so ops registered after page load show up
  // without a reload — the catalog is otherwise fetched once per venue.
  const [refreshTick, setRefreshTick] = useState(0);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  }
  // Fetches the full catalog once per venue — search text only filters
  // client-side (see filteredAssets) so typing never triggers a refetch.
  useEffect(() => {
     if (!venue) {
       resetOperationsQuery();
       return invalidateOperationsQuery;
     }
     void runOperationsQuery(
       async () => {
          // Discover ops from the venue catalog (v/ops + v/test/ops), plus the
          // signed-in user's own w/ops, by path — one read per tree, no
          // per-asset round trip. Each op keeps its resolvable catalog path as
          // its id (drives the URL).
          const ops = await listCatalogOperations(venue, { includeUserOps: isAuthenticated });
          const sorted = [...ops].sort((a, b) =>
            (a.metadata?.name ?? a.path).localeCompare(b.metadata?.name ?? b.path));
          return sorted.map(op => new Operation(op.path, venue, op.metadata));
       },
       { clear: true },
     );
     return invalidateOperationsQuery;
  }, [
    venue,
    isAuthenticated,
    refreshTick,
    runOperationsQuery,
    resetOperationsQuery,
    invalidateOperationsQuery,
  ]);

  const adapterOptions = useMemo(() => {
    const names = assetsMetadata
      .map(a => (a.metadata?.operation?.adapter as string | undefined)?.split(':')[0])
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [assetsMetadata]);

  const keywordOptions = useMemo(() => {
    const all = assetsMetadata.flatMap(a => Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : []);
    return [...new Set(all)].sort();
  }, [assetsMetadata]);

  const tagOptions = useMemo(() => [
    ...adapterOptions.map((a) => ({ value: a, label: a, groupTag: "Adapter" })),
    ...keywordOptions.map((k) => ({ value: k, label: k, groupTag: "Keyword" })),
  ], [adapterOptions, keywordOptions]);

  const filteredAssets = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return assetsMetadata.filter(a => {
      if (selectedTags.length > 0) {
        const adapter = (a.metadata?.operation?.adapter as string | undefined)?.split(':')[0];
        const keywords: string[] = Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : [];
        if (!selectedTags.some(tag => tag === adapter || keywords.includes(tag))) return false;
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
      <TopBar/>
      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4 justify-end">
          <FiltersSheet
            title="Filter Operations"
            description="Search and narrow down operations by tag."
            search={{ value: searchInput, onChange: handleSearchChange, placeholder: "Type keyword to search…" }}
            groups={[]}
          />
        </div>
      </div>
       <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
            <PlayCircle size={64} className="text-primary"></PlayCircle>
            <div className="text-primary text-lg">Get Started with Operations</div>
            <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available operations</div>

        </div>
      </ContentLayout>
     )
  }

  return (
    <ContentLayout>
      <TopBar venueName={venueObj?.metadata.name}/>
      <div className="flex flex-col items-center justify-center">
        <ListToolbar
          className="mt-4"
          actions={
            <>
              <FiltersSheet
                title="Filter Operations"
                description="Search and narrow down operations by tag."
                search={{ value: searchInput, onChange: handleSearchChange, placeholder: "Type keyword to search…" }}
                groups={tagOptions.length > 0 ? [{ label: "Tags", options: tagOptions, selected: selectedTags, onChange: setSelectedTags }] : []}
              />
              <Button
                variant="outline"
                size="icon"
                data-testid="refresh-operations"
                aria-label="Refresh operations"
                title="Refresh operations"
                disabled={isLoading}
                onClick={() => setRefreshTick((t) => t + 1)}
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : undefined} />
              </Button>
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
            {
            pageItems.map((asset) => (
              <AssetCard key={asset.id} asset={asset} type="operations" compact={true} venue={venue ?? undefined} authenticated={isAuthenticated}/>
            ))}
          </div>
        )}

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>
      </div>
      
    </ContentLayout>
  );
}
