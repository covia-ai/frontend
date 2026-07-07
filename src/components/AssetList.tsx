"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import { useSearchParams, usePathname } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

import { Asset, DataAsset }from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { useVenues } from "@/hooks/use-venues";
import { FileKey, Search }from "lucide-react";
import { CreateAssetComponent } from "./CreateAssetComponent";
import { TopBar } from "./admin-panel/TopBar";


export function AssetList() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();

  const itemsPerPage = 12
  const _offset = 0;
  const _limit = itemsPerPage;
  const [_totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(search ?? "");
  const pathname = usePathname();

  const { venues } = useVenues();
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  const authData = useAuthStore((x) => x.auth);
  const nextPage = (page: number) => {
    setCurrentPage(page)
  }
  const prevPage = (page: number) => {
    setCurrentPage(page)
  }
  // Shared by the initial-load effect and the create-asset refresh; isStale
  // drops in-flight results after venue/search change or unmount, so stale
  // assets never land in the fresh list.
  function fetchAssets(isStale: () => boolean = () => false) {
    if (!venueObj) return;
    const venue = getVenueFor(venueObj, authData)
    setAssetsMetadata([]);
    setLoading(true);
    try {
      venue.listAssets().then((assetList) => {
        assetList.items.forEach((assetId: string) => {
          venue.getAsset(assetId).then((asset: Asset) => {
            asset.getMetadata().then((metadata: any) => {
              if (isStale()) return;
              if (metadata.name != undefined && metadata.operation == undefined) {
                  if(search && search.length>0 ) {
                      if(metadata?.name?.toLowerCase().indexOf(search.toLowerCase()) != -1 || asset.id?.toLowerCase().indexOf(search.toLowerCase()) != -1)
                         setAssetsMetadata(prevArray => [...prevArray, new DataAsset(asset.id, asset.venue, metadata)]);
                  }
                  else {
                       setAssetsMetadata(prevArray => [...prevArray, new DataAsset(asset.id, asset.venue, metadata)]);
                  }
              }
            })
          })
        })
        if (!isStale()) setLoading(false)
      })
    }
    catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  useEffect(() => {
    let ignore = false;
    fetchAssets(() => ignore);
    return () => { ignore = true; };
  }, [search, venueObj, authData]);

  useEffect(() => {
    setTotalItems(assetsMetadata.length)
    setTotalPages(Math.ceil(assetsMetadata.length / itemsPerPage))
  }, [assetsMetadata])

  if(venues.length == 0 ) {
     return (
      <ContentLayout>
      <TopBar venueName={venueObj?.metadata.name}/>

      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Type keyword to search…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  router.push(pathname + "?search=" + searchInput);
              }}
              className="pl-8"
            />
          </div>
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
          <div className="flex gap-2 items-center w-full mt-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type keyword to search…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    router.push(pathname + "?search=" + searchInput);
                }}
                className="pl-8"
              />
            </div>
          </div>
  
          <div className="text-card-foreground text-xs flex flex-row my-2 ">
            {isLoading ? "Loading…" : `Page ${currentPage} : Showing ${assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of ${assetsMetadata.length}`}
          </div>
          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={isLoading}></PaginationHeader>

          {isLoading ? (
            <div className="flex flex-row items-center justify-center w-full h-100">
              <Spinner variant="ellipsis" className="text-primary" size={64}/>
            </div>
          ) : (
            <div className=" grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 items-stretch justify-center gap-4">
              {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset) =>
                <AssetCard key={asset.id} asset={asset} type="assets" compact={true}/>
              )}
            </div>
          )}

          <CreateAssetComponent sendDataToParent={handleDataFromChild} ></CreateAssetComponent>
          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={isLoading}></PaginationHeader>

        </div>
      </ContentLayout>
  );
} 