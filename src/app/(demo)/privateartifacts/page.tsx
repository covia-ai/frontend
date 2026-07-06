"use client";


import Link from "next/link";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Eraser, PlusCircle, CircleArrowRight, CopyIcon, Save, AlertCircle, CheckCircle2Icon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { Asset, DataAsset } from "@covia/covia-sdk";
import { JsonEditor } from "json-edit-react";

import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";


import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CreateAssetComponent } from "@/components/CreateAssetComponent";

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(search ?? "");

  const [assetCreated, setAssetCreated] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [newJsonData, setNewJsonData] = useState({});

  const itemsPerPage = 6
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1)
  const [noOfItemsOnPage, setNoOfItemsOnPage] = useState(0);
  const venue = useAuthenticatedVenue();

  const nextPage = (page: number) => {
    setCurrentPage(page)

  }
  const prevPage = (page: number) => {
    setCurrentPage(page)

  }


  function fetchAssets() {
    if (!venue) return;
    setAssetsMetadata([]);
    venue.listAssets().then((assetList) => {
      assetList.items.forEach((assetId: string) => {
        venue.getAsset(assetId).then((asset: Asset) => {
          asset.getMetadata().then((metadata: object) => {
            if (metadata.name != undefined && metadata.operation == undefined) {
              setAssetsMetadata(prevArray => [...prevArray, new DataAsset(asset.id, asset.venue, metadata)]);
            }
          })
        })
      })
    })

  }
  useEffect(() => {

  }, []);
  useEffect(() => {
    setTotalItems(assetsMetadata.length)
    setTotalPages(Math.ceil(assetsMetadata.length / itemsPerPage))

  }, [assetsMetadata]);

  function copyAsset(jsonData: JSON) {
    try {
      venue?.register(jsonData).then((asset: Asset) => {
        if (asset != undefined && asset != null) {
          setNewJsonData({})
          setAssetCreated(true);
          fetchAssets();
        }
      })
    }
    catch (error) {
      setAssetCreated(false);
    }
  }
  function handleDataFromChild(status: boolean) {
    fetchAssets();
  }

  return (
    <ContentLayout>
      <SmartBreadcrumb />

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


        <div className="text-card-foreground text-xs flex flex-row my-2 ">Page {currentPage} : Showing {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {assetsMetadata.length} </div>
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

        </div>
           <CreateAssetComponent sendDataToParent={handleDataFromChild} ></CreateAssetComponent>

      </div>
    </ContentLayout>
  );
}