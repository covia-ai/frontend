"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from "react";

import { Asset, DataAsset }from "@covia/covia-sdk";
import { loadAssetEntries } from "@/lib/asset-metadata";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useAuthStore } from "@/hooks/use-auth";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { useVenues } from "@/hooks/use-venues";
import { FileKey, Lock }from "lucide-react";
import { CreateAssetComponent } from "./CreateAssetComponent";
import { TopBar } from "./admin-panel/TopBar";
import { FiltersSheet } from "./FiltersSheet";
import { Button } from "./ui/button";


interface AssetListProps {
  venueId?: string;
}

export function AssetList({ venueId }: AssetListProps = {}) {
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
  const isAuthenticated = authData !== null;
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
  // Shared by the initial-load effect and the create-asset refresh; isStale
  // drops in-flight results after venue change or unmount, so stale assets
  // never land in the fresh list. Fetches the full id list unconditionally —
  // search text only filters client-side (see filteredAssets) so typing
  // never triggers a refetch. Metadata resolves through the content-addressed
  // cache (immutable, so revisits are near-free) and streams in per batch,
  // so the grid fills incrementally instead of blocking on the slowest of
  // N individual GETs.
  const fetchAssets = useCallback((isStale: () => boolean = () => false) => {
    if (!venue) return;
    setAssetsMetadata([]);
    setLoading(true);
    venue.listAssets()
      .then((assetList) =>
        loadAssetEntries(venue, assetList.items, (entries) => {
          if (isStale()) return;
          const dataAssets = entries
            .filter((e) => e.metadata.name != undefined && e.metadata.operation == undefined)
            .map((e) => new DataAsset(e.id, venue, e.metadata));
          setAssetsMetadata(dataAssets);
          setLoading(false);
        }))
      .catch((error) => {
        console.error('Error fetching data:', error);
        if (!isStale()) setLoading(false);
      });
  }, [venue]);

  useEffect(() => {
    let ignore = false;
    fetchAssets(() => ignore);
    return () => { ignore = true; };
  }, [fetchAssets]);

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

  useEffect(() => {
    setTotalPages(Math.ceil(filteredAssets.length / itemsPerPage))
    setCurrentPage(1)
  }, [filteredAssets])

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
    fetchAssets();
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
              {filteredAssets.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset) =>
                <AssetCard key={asset.id} asset={asset} type="assets" compact={true} venue={venue ?? undefined} authenticated={isAuthenticated}/>
              )}
            </div>
          )}

          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={isLoading}></PaginationHeader>

        </div>
      </ContentLayout>
  );
}
