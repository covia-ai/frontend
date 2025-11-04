"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'

import { useEffect, useState } from "react";

import { Asset, Operation, Venue } from "@/lib/covia";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Spinner } from '@/components/ui/shadcn-io/spinner';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";

interface OperationsListProps {
  venueSlug?: string; // Optional venue slug for venue-specific pages
}

export function OperationsList({ venueSlug }: OperationsListProps) {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();

  const itemsPerPage = 12
  const offset = 0;
  const limit = itemsPerPage;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1)

  const nextPage = (page: number) => {
    setCurrentPage(page)
  }
  const prevPage = (page: number) => {
    setCurrentPage(page)
  }
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name})
  
  function fetchAssets(offset, limit) {
    setAssetsMetadata([]);
      try {
        venue?.getAssets().then((assets) => {
        assets.forEach((asset) => {
          asset.getMetadata().then((metadata: object) => {
            if (metadata.operation != undefined) 
              if(search && search.length>0 ) {
                  if(metadata?.name?.toLowerCase().indexOf(search.toLowerCase()) != -1 || asset.id?.toLowerCase().indexOf(search.toLowerCase()) != -1)
                      setAssetsMetadata(prevArray => [...prevArray, new Operation(asset.id, asset.venue, metadata)]);
                }
                else {
                    setAssetsMetadata(prevArray => [...prevArray, new Operation(asset.id, asset.venue, metadata)]);
                }
          })
          setLoading(false)
        })
      })
    }
   catch (error) {
        console.error('Error fetching data:', error);
   } 
  }
  
  useEffect(() => {
    fetchAssets(offset, limit);
  }, []);

  useEffect(() => {
    setTotalItems(assetsMetadata.length)
    setTotalPages(Math.ceil(assetsMetadata.length / itemsPerPage))
  }, [assetsMetadata])

  return (
    <ContentLayout title="Operations">
      <SmartBreadcrumb venueName={venue.name}/>
      <div className="flex flex-col items-center justify-center">
         <div className="flex flex-row items-center justify-center w-full space-x-2 ">
          <Search />
        </div>
        {!isLoading && 
        <>
          <div className="text-card-foreground text-xs flex flex-row my-2">Page {currentPage} : Showing {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {assetsMetadata.length} </div>
          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
            {
            assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset, index) => (
              <AssetCard key={index} asset={asset} type="operations" venueSlug={venueSlug}/>
            ))}
          </div>
          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
        </>
         }
        {isLoading && 
          <div className="flex flex-row items-center justify-center w-full h-100">
            <Spinner variant="ellipsis" className="text-primary" size={64}/>
          </div>
        }
      </div>
      
    </ContentLayout>
  );
} 