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
import { Search } from "@/components/search";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Eraser, PlusCircle, CircleArrowRight, CopyIcon, Save, AlertCircle, CheckCircle2Icon } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { Venue,Asset } from "@/lib/covia/covialib";
import { JsonEditor } from "json-edit-react";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { TbCircleDashedNumber1,  TbCircleDashedNumber2} from "react-icons/tb";


import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CreateAssetComponent } from "@/components/CreateAssetComponent";

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');

  const [assetCreated, setAssetCreated] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [newJsonData, setNewJsonData] = useState({});

  const itemsPerPage = 6
  let offset = 0;
  let limit=itemsPerPage;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1)
  
 const nextPage = (page: number) => {
         setCurrentPage(page)
         offset = limit;
         fetchAssets(offset,limit)
    
  }
  const prevPage = (page: number) => {
         setCurrentPage(page)
         offset = limit - itemsPerPage;
         fetchAssets(offset,limit)
    
  }
  const venue = useStore(useVenue, (x) => x).venue;
  if (!venue) return null;

    function fetchAssets(offset,limit) {
       setAssetsMetadata([]);
       console.log(offset+" : "+limit)
        venue.getAssets(offset,limit).then((assets) => {
              assets.forEach((asset : Asset) => {
               asset.getMetadata().then((metadata: Object) => {
                     if(metadata.name != undefined && metadata.operation == undefined) {

                      setAssetsMetadata(prevArray => [...prevArray, new Asset(asset.id, asset.venue, metadata)]);
                     }
               })
                 
                              
               })
                
          })  
             
    }
    useEffect(() => {
            fetchAssets(offset, limit)
      }, []);
   
  function copyAsset(jsonData:JSON) {
    try {
      venue?.createAsset(jsonData).then( (asset:Asset) => {
             if(asset != undefined && asset != null) {
                     setNewJsonData({})
                     setAssetCreated(true);
                     fetchAssets(offset,limit);
              }  
      })
    }
    catch(error) {
      setAssetCreated(false);
      console.log(error)
    }
  }   
  function handleDataFromChild(status: boolean) {
    fetchAssets(offset,limit);
  }    

  return (
    <ContentLayout title="Assets">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Assets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
         
          <div className="flex flex-col items-center justify-center">
              <div className="flex flex-row items-center justify-center w-full space-x-2 ">
                <Search/> 
                <CreateAssetComponent  sendDataToParent={handleDataFromChild} ></CreateAssetComponent>
                   
              </div>

             <Pagination>
              <PaginationContent className="my-4 flex flex-row-reverse w-full">
                 {currentPage != totalPages && currentPage < totalPages && <PaginationItem>
                  <PaginationNext href="#" onClick={() => nextPage(currentPage + 1)} />
                </PaginationItem>}

                {currentPage != 1 && <PaginationItem>
                  <PaginationPrevious href="#" onClick={() => prevPage(currentPage - 1)}/>
                </PaginationItem>}
               
              </PaginationContent>
            </Pagination>
            <div className="text-slate-600 text-xs flex flex-row my-2 ">Page {currentPage} : Showing {assetsMetadata.length} of X</div> 
           <div className="text-slate-600 text-xs flex flex-row my-2 "></div> 

              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center gap-4">
              {assetsMetadata.map((asset, index) => ( 
                  
                   <Card key={index} className="px-2  shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl ">
                        <CardTitle  className="px-2 flex flex-row items-center justify-between">

                        <div>{asset.metadata.name}</div>
                        <Dialog>
                                 <DialogTrigger><CopyIcon></CopyIcon></DialogTrigger>
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
                                       {Object.keys(newJsonData).length ==0 && <JsonEditor data={asset.metadata}
                                        setData={setNewJsonData}
                                        rootName="metadata"
                                        rootFontSize="1em"
                                        collapse={1}
                                        maxWidth="90vw"
                                     /> }
                                        {Object.keys(newJsonData).length > 0 && <JsonEditor data={newJsonData}
                                        setData={setNewJsonData}
                                        rootName="metadata"
                                        rootFontSize="1em"
                                        collapse={1}
                                        maxWidth="90vw"
                                        /> }     
                                 </DialogContent>
                        </Dialog>
                        </CardTitle>
                        <CardContent className="flex flex-col px-2"> 
                                <div className="text-xs text-slate-600 line-clamp-1">{asset.metadata.description}</div>
                                <div className="flex flex-row mt-4 space-x-2">
                                  {asset.metadata?.keywords?.map((keyword,index) => (
                                        
                                        index <2 && <Badge className="text-xs"  key={index}>{keyword}</Badge>
                                  ))}
                                </div>
                                <div className="flex flex-row items-center justify-between mt-4">
                                    <CircleArrowRight onClick={() => {redirect("/venues/default/assets/"+asset.id)}}/>
                                </div>
                          </CardContent>
                    </Card>           
                         
                 ))}
             
             </div>
             
          </div>
    </ContentLayout>
  );
}