"use client";



import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Search } from "@/components/search";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { useEffect, useState } from "react";
import { Asset, DataAsset, Venue } from "@/lib/covia";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { CreateAssetComponent } from "@/components/CreateAssetComponent";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "@/components/AssetCard";
import { PaginationHeader } from "@/components/PaginationHeader";

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();

  const [assetCreated, setAssetCreated] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);

  const itemsPerPage = 6
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setLoading] = useState(true);

  const nextPage = (page: number) => {
    setCurrentPage(page)

  }
  const prevPage = (page: number) => {
    setCurrentPage(page)

  }
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name})

  function fetchAssets() {
    setAssetsMetadata([]);
    venue.getAssets().then((assets) => {
      assets.forEach((asset: Asset) => {
        asset.getMetadata().then((metadata: object) => {
          if (metadata.name != undefined && metadata.operation == undefined) {
              if(search && search.length>0 ) {
                  if(metadata?.name?.toLowerCase().indexOf(search.toLowerCase()) != -1)
                     setAssetsMetadata(prevArray => [...prevArray, new DataAsset(asset.id, asset.venue, metadata)]);
              }
              else {
                   setAssetsMetadata(prevArray => [...prevArray, new DataAsset(asset.id, asset.venue, metadata)]);
             
              }
          }
        })
        setLoading(false)


      })

    })

  }
  useEffect(() => {
    fetchAssets()

  }, []);
  useEffect(() => {
    setTotalItems(assetsMetadata.length)
    setTotalPages(Math.ceil(assetsMetadata.length / itemsPerPage))

  }, [assetsMetadata]);

 
  function handleDataFromChild(status: boolean) {
    fetchAssets();
  }

  return (
    <ContentLayout title="Assets">
      <SmartBreadcrumb />

      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-center w-full space-x-2 ">
          <Search />
        </div>

        {!isLoading && 
          <>
            <div className="text-card-foreground text-xs flex flex-row my-2 ">Page {currentPage} : Showing {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {assetsMetadata.length} </div>
            <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
              {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset, index) =>
                <AssetCard key={index} asset={asset} type="assets" venueSlug={encodeURIComponent(venue.venueId)}/>
              )}
            </div>
            <CreateAssetComponent sendDataToParent={handleDataFromChild} ></CreateAssetComponent>
            <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>

         </>}
        {isLoading && 
        <div className="flex flex-row items-center justify-center w-full h-100">
          <Spinner variant="ellipsis" className="text-primary" size={64}/>
        </div>}

      </div>
    </ContentLayout>
  );
}