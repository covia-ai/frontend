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
import { PlayCircle } from "lucide-react";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { FiltersSheet } from "./FiltersSheet";


interface OperationsListProps {
  venueId?: string;
}

export function OperationsList({ venueId }: OperationsListProps = {}) {
  const searchParams = useSearchParams()
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();

  const itemsPerPage = 12
  const [totalPages, setTotalPages] = useState(10);
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
          // Discover ops from the venue catalog (v/ops + v/test/ops) by path —
          // one read per tree, no per-asset round trip. Each op keeps its
          // resolvable catalog path as its id (drives the URL).
          const ops = await listCatalogOperations(activeVenue);
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
  }, [venue]);

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

  useEffect(() => {
    setTotalPages(Math.ceil(filteredAssets.length / itemsPerPage));
    setCurrentPage(1);
  }, [filteredAssets]);

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
          <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 items-stretch justify-center gap-4">
            {
            filteredAssets.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset) => (
              <AssetCard key={asset.id} asset={asset} type="operations" compact={true} venue={venue ?? undefined} authenticated={authData !== null}/>
            ))}
          </div>
        )}

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={isLoading}></PaginationHeader>
      </div>
      
    </ContentLayout>
  );
}
