"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Asset, Operation }from "@covia/covia-sdk";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { PlayCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { FiltersSheet } from "./FiltersSheet";

// Rows to aim for per page; the column count comes from the grid itself.
const ROWS_PER_PAGE = 4;

interface OperationsListProps {
  venueId?: string;
}

export function OperationsList({ venueId }: OperationsListProps = {}) {
  const searchParams = useSearchParams()
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();

  // A fixed page size wasted the extra columns a wide screen gets: 12 items
  // over lg's 4 columns is 3 rows, and over 6 columns only 2. Size the page
  // from the columns the grid is actually rendering instead, so a wider window
  // shows more operations rather than shorter rows.
  const { ref: gridRef, columns } = useGridColumns(3);
  const itemsPerPage = Math.max(1, columns * ROWS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? "");
  const pathname = usePathname();

  const { venues } = useVenues();
  const venueObj = useVenueForRoute(venueId);
  const authData = useAuthStore((x) =>
    venueObj ? x.authMap[venueObj.venueId] ?? null : null
  );
  const venue = useMemo(
    () => venueObj ? getVenueFor(venueObj, authData) : null,
    [venueObj, authData],
  );
  const isAuthenticated = authData !== null;
  // Bumped by the refresh control so ops registered after page load show up
  // without a reload — the catalog is otherwise fetched once per venue.
  const [refreshTick, setRefreshTick] = useState(0);

  const nextPage = (page: number) => {
    setCurrentPage(page)
  }
  const prevPage = (page: number) => {
    setCurrentPage(page)
  }
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  }
  // Fetches the full catalog once per venue — search text only filters
  // client-side (see filteredAssets) so typing never triggers a refetch.
  useEffect(() => {
     if (!venue) return;
     const activeVenue = venue;
     let ignore = false;
     async function fetchAssets() {
        setLoading(true);
        setAssetsMetadata([]);
        try {
          // Discover ops from the venue catalog (v/ops + v/test/ops), plus the
          // signed-in user's own w/ops, by path — one read per tree, no
          // per-asset round trip. Each op keeps its resolvable catalog path as
          // its id (drives the URL).
          const ops = await listCatalogOperations(activeVenue, { includeUserOps: isAuthenticated });
          const sorted = [...ops].sort((a, b) =>
            (a.metadata?.name ?? a.path).localeCompare(b.metadata?.name ?? b.path));
          if (!ignore) setAssetsMetadata(sorted.map(op => new Operation(op.path, activeVenue, op.metadata)));
        } catch (error) {
          console.error('Error fetching operations:', error);
        } finally {
          if (!ignore) setLoading(false);
        }
      }
     fetchAssets();
     return () => { ignore = true; };
  }, [venue, isAuthenticated, refreshTick]);

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

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / itemsPerPage));

  // Filtering starts a new result set, so go back to the first page.
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredAssets]);

  // Resizing changes the page size, which can strand you past the last page —
  // clamp rather than reset, so widening the window keeps you roughly in place
  // instead of throwing you back to page 1.
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
        <div className="flex gap-2 items-center w-full mt-4 justify-end">
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
        </div>
        <div className="flex flex-row flex-nowrap items-center justify-between w-full my-2 gap-4">
          <div className="text-card-foreground text-xs whitespace-nowrap">
            {!isLoading && `Page ${currentPage} : Showing ${filteredAssets.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of ${filteredAssets.length}`}
          </div>
          <div className="shrink-0">
            <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={isLoading}></PaginationHeader>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-row items-center justify-center w-full h-100">
            <Spinner variant="ellipsis" className="text-primary" size={64}/>
          </div>
        ) : (
          <div ref={gridRef} className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 items-stretch justify-center gap-4">
            {
            filteredAssets.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset) => (
              <AssetCard key={asset.id} asset={asset} type="operations" compact={true} venue={venue ?? undefined} authenticated={isAuthenticated}/>
            ))}
          </div>
        )}

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={isLoading}></PaginationHeader>
      </div>
      
    </ContentLayout>
  );
}
