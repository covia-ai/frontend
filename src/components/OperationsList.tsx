"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { CircleArrowRight, Copy, InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { Asset, DataAsset, Operation, Venue } from "@/lib/covia";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  let offset = 0;
  const limit = itemsPerPage;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1)

  const nextPage = (page: number) => {
    setCurrentPage(page)
    offset = limit;
    fetchAssets(offset, limit)
  }
  
  const prevPage = (page: number) => {
    setCurrentPage(page)
    offset = limit - itemsPerPage;
    fetchAssets(offset, limit)
  }

  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})

  function fetchAssets(offset, limit) {
    setAssetsMetadata([]);
    venue?.getAssets().then((assets) => {
      assets.forEach((asset) => {
        asset.getMetadata().then((metadata: object) => {
          if (metadata.operation != undefined) 
            setAssetsMetadata(prevArray => [...prevArray, new Operation(asset.id, asset.venue, metadata)]);
        })
      })
    })
  }
  
  useEffect(() => {
    fetchAssets(offset, limit);
  }, []);

  useEffect(() => {
    setTotalItems(assetsMetadata.length)
    setTotalPages(Math.ceil(assetsMetadata.length / itemsPerPage))
    setLoading(false)
  }, [assetsMetadata])

  function renderJSONMap(jsonObject: JSON, requiredKeys: string[] = []) {
    const keys = Object.keys(jsonObject);
    const type = new Array<string>();
    const description = new Array<string>();
    keys.map((key, index) => {
      const jsonValue = jsonObject[key];
      type[index] = jsonValue.type;
      description[index] = jsonValue.description;
    });
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary text-white">
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key, index) => (
            <TableRow key={index}>
              <TableCell>{key} {requiredKeys != undefined && requiredKeys?.indexOf(key) != -1 && <span className="text-red-400">*</span>}</TableCell>
              <TableCell>{type[index]}</TableCell>
              <TableCell>{description[index]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Determine the base path for navigation
  const getOperationPath = (assetId: string) => {
    if (venueSlug) {
      return `/venues/${venueSlug}/operations/${assetId}`;
    }
    return `/venues/default/operations/${assetId}`;
  };

  return (
    <ContentLayout title="Operations">
      <SmartBreadcrumb />
      <div className="flex flex-col items-center justify-center">
        <div className="text-slate-600 text-xs flex flex-row mt-2">Page {currentPage} : Showing {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {assetsMetadata.length} </div>
        <Pagination>
          <PaginationContent className="flex flex-row-reverse w-full">
            {currentPage != totalPages && currentPage < totalPages && <PaginationItem>
              <PaginationNext href="#" onClick={() => nextPage(currentPage + 1)} />
            </PaginationItem>}

            {currentPage != 1 && <PaginationItem>
              <PaginationPrevious href="#" onClick={() => prevPage(currentPage - 1)} />
            </PaginationItem>}
          </PaginationContent>
        </Pagination>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
          {!isLoading && assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset, index) => (
            <Sheet key={index} >
              <Card key={index} className="shadow-md h-full bg-slate-100 flex flex-col rounded-md hover:border-accent hover:border-2 h-48">
                {/* Fixed-size header */}                
                
                  <div className="h-14 p-2 flex flex-row items-center border-b bg-slate-50">
                   <div className="truncate flex-1 mr-2 font-semibold text-sm"
                   onClick={() => { router.push("/venues/default/operations/" + asset.id) }}>{asset.metadata.name || 'Unnamed Asset'}  
                    </div>
                    <Tooltip><TooltipTrigger>
                      <SheetTrigger asChild>
                      <InfoIcon size={16}></InfoIcon>
                      
                    </SheetTrigger> 
                    <TooltipContent>Information</TooltipContent>
                    </TooltipTrigger> 
                    </Tooltip> 
                  </div>
                <SheetContent className="min-w-lg">
                  <SheetHeader className="flex flex-col items-center justify-center">
                    <SheetTitle>{asset.metadata.name}</SheetTitle>
                    {asset.metadata.description && <SheetDescription>
                      {asset.metadata.description}
                    </SheetDescription>}
                  </SheetHeader>
                  {asset.metadata.operation?.input?.properties && (
                    <div className="flex flex-center flex-col mx-4">
                      <div className="p-2">Inputs</div>
                      <Separator />
                      <div className="grid grid-cols-1">{asset.metadata.operation?.input?.properties &&
                        renderJSONMap(asset.metadata.operation?.input?.properties, asset.metadata.operation?.input?.required)
                      }
                      </div>
                    </div>
                  )}
                  {asset.metadata.operation?.output?.properties && (
                    <div className="flex flex-center flex-col mx-4">
                      <div className="p-2">Outputs</div>
                      <Separator />
                      <div className="grid grid-cols-1">{asset.metadata.operation?.output?.properties &&
                        renderJSONMap(asset.metadata.operation?.output?.properties)
                      }
                      </div>
                    </div>
                  )}
                  <SheetFooter>
                    <SheetClose asChild>
                      {asset.id && asset.metadata?.operation?.input && <Button type="submit" onClick={() => { router.push(getOperationPath(asset.id)) }}>Run</Button>}
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              
                 {/* Flexible middle section */}
              <div className="flex-1 p-2 flex flex-col justify-between" onClick={() => { router.push("/venues/default/operations/" + asset.id) }}>
                <div className="text-xs text-slate-600 line-clamp-3 mb-2">{asset.metadata.description || 'No description available'}</div>
              </div>
               {/* Fixed-size footer */}
                <div className="p-2 h-12 flex flex-row-reverse items-center justify-between" onClick={() => { router.push("/venues/default/operations/" + asset.id) }}>
                  
                  <CircleArrowRight color="#6B46C1" onClick={() => { router.push("/venues/default/operations/" + asset.id) }} />
                </div>
              </Card>
            </Sheet>
          ))}
           
        </div>
        <Pagination>
          <PaginationContent className="flex flex-row-reverse w-full">
            {currentPage != totalPages && currentPage < totalPages && <PaginationItem>
              <PaginationNext href="#" onClick={() => nextPage(currentPage + 1)} />
            </PaginationItem>}

            {currentPage != 1 && <PaginationItem>
              <PaginationPrevious href="#" onClick={() => prevPage(currentPage - 1)} />
            </PaginationItem>}
          </PaginationContent>
        </Pagination>

      </div>
    </ContentLayout>
  );
} 