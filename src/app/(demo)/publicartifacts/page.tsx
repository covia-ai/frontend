"use client";



import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Search } from "@/components/search";
import { Card } from "@/components/ui/card";
import { ArrowRight, CircleArrowRight, CopyIcon, Play, Save, SquareArrowOutUpRight,  } from "lucide-react";
import { useRouter } from "next/navigation";
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

import {  Asset, DataAsset, Venue } from "@/lib/covia";
import { JsonEditor } from "json-edit-react";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";


import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CreateAssetComponent } from "@/components/CreateAssetComponent";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { Iconbutton } from "@/components/Iconbutton";

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();

  const [assetCreated, setAssetCreated] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [newJsonData, setNewJsonData] = useState({});

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
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})

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

  function copyAsset(jsonData: JSON) {
    try {
      venue?.createAsset(jsonData).then((asset: Asset) => {
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
    <ContentLayout title="Assets">
      <SmartBreadcrumb />

      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-center w-full space-x-2 ">
          <Search />

        </div>

         {!isLoading && <>
          <div className="text-slate-600 text-xs flex flex-row my-2 ">Page {currentPage} : Showing {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {assetsMetadata.length} </div>
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
            {assetsMetadata.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset, index) =>

              <Card key={index} className="shadow-md h-full bg-slate-100 flex flex-col rounded-md hover:border-accent hover:border-2 h-48 py-2">
                {/* Fixed-size header */}
                <div className="h-14 p-2 flex flex-row items-center bg-slate-50">
                  <div className="truncate flex-1 mr-2 font-semibold text-sm"
                  onClick={() => { router.push("/venues/"+venue.venueId+"/assets/" + asset.id) }}>{asset.metadata.name || 'Unnamed Asset'}</div>
                  <Dialog>
                    <DialogTrigger>
                      <Iconbutton icon={CopyIcon} message="Copy Asset"/>
                      
                      </DialogTrigger>
                    <DialogContent className="h-11/12 min-w-10/12 ">
                      <DialogTitle className="flex flex-row items-center justify-between mr-4">
                        Copy asset
                        <DialogClose>
                          {JSON.stringify(newJsonData) != "{}" &&
                            <Button type="button" onClick={() => copyAsset(newJsonData)}> <Save></Save></Button>
                          }
                          {JSON.stringify(newJsonData) == "{}" &&
                            <Button type="button" disabled><Save></Save></Button>
                          }

                        </DialogClose>
                      </DialogTitle>
                      {Object.keys(newJsonData).length == 0 && <JsonEditor data={asset.metadata}
                        setData={setNewJsonData}
                        rootName="metadata"
                        rootFontSize="1em"
                        collapse={1}
                        maxWidth="90vw"
                      />}
                      {Object.keys(newJsonData).length > 0 && <JsonEditor data={newJsonData}
                        setData={setNewJsonData}
                        rootName="metadata"
                        rootFontSize="1em"
                        collapse={1}
                        maxWidth="90vw"
                      />}
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Flexible middle section */}
                <div className="flex-1 p-2 flex flex-col justify-between" onClick={() => { router.push("/venues/"+venue.venueId+"/assets/" + asset.id) }}>
                  <div className="text-xs text-slate-600 line-clamp-3 mb-2">{asset.metadata.description || 'No description available'}</div>


                </div>
                {/* Fixed-size footer */}
                <div className="p-2 h-12 flex flex-row items-center justify-between" onClick={() => { router.push("/venues/"+venue.venueId+"/assets/" + asset.id) }}>
                  <div className="flex flex-row space-x-2">
                    {asset.metadata?.keywords?.map((keyword, index) => (
                      index < 2 && <Badge variant="default" className="border bg-secondary text-white text-xs" key={index}>{keyword}</Badge>
                    ))}
                  </div>
                <Iconbutton icon={SquareArrowOutUpRight} message="View Asset" path="asset" pathId={asset.id}/>
                </div>
              </Card>

            )}
          
            
              
          </div>
          <CreateAssetComponent sendDataToParent={handleDataFromChild} ></CreateAssetComponent>
        </>}
          {isLoading && 
                <div className="flex flex-row items-center justify-center w-full h-100">
                  <Spinner variant="ellipsis" className="text-primary" size={64}/>
                </div>}
      </div>
    </ContentLayout>
  );
}