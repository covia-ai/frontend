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
import {  CircleArrowRight, Copy } from "lucide-react";
import { redirect } from "next/navigation";
import { useSearchParams } from 'next/navigation'


import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { Asset } from "@/lib/covia/covialib";
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

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(true);

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
  
  function fetchAssets(offset, limit) {
        console.log(offset+" : "+limit)
        setAssetsMetadata([]);
            venue.getAssets(offset,limit).then((assets) => {
            
              assets.forEach((asset) => {
                 asset.getMetadata().then((metadata: Object) => {

                     if( metadata.operation != undefined)
                          setAssetsMetadata(prevArray => [...prevArray, new Asset(asset.id, asset.venue, metadata)]);
                      
                })
                                  
               })
                
          })  
  }
      useEffect(() => {
          fetchAssets(offset, limit);
      }, []);
       
     useEffect(() => {
       
        setLoading(false)
     },[assetsMetadata])
        
       function renderJSONMap(jsonObject:JSON, requiredKeys: string[] = []) {
        let keys = Object.keys(jsonObject);
        let type = new Array<String>();
        let description = new Array<String>();
        keys.map((key, index) => {
            let jsonValue = jsonObject[key];
            type[index] = jsonValue.type;
            description[index] = jsonValue.description;
        });
          return (
             <Table>
              <TableHeader>
                <TableRow className="bg-secondary">
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
                <BreadcrumbPage>Operations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col items-center justify-center">
              <Search/>
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

              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center gap-4">
              {!isLoading && assetsMetadata?.map((asset, index) => ( 
                  
                    <Sheet key={index} >   
                        <Card className=" px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl t-pink-400">
                            <SheetTrigger asChild>
                                 <CardTitle  className="px-2 flex flex-row items-center justify-between">

                                    <div>{asset.metadata.name}</div>
                                      

                                  </CardTitle>                        
                              </SheetTrigger>
                       <SheetContent className="min-w-lg">
                        <SheetHeader  className="flex flex-col items-center justify-center">
                          <SheetTitle>{asset.metadata.name}</SheetTitle>
                          {asset.metadata.description && <SheetDescription>
                            {asset.metadata.description}
                          </SheetDescription>}
                           
                        </SheetHeader> 
                        {asset.metadata.operation?.input?.properties && (
                            <div className="flex flex-center flex-col mx-4">
                              <div className="p-2">Inputs</div>
                              <Separator/>
                                 <div className="grid grid-cols-1">{asset.metadata.operation?.input?.properties && 
                                 
                                 renderJSONMap(asset.metadata.operation?.input?.properties,asset.metadata.operation?.input?.required)
                                   
                                 }
                                 </div>
                          </div>  
                        )}
                        {asset.metadata.operation?.output?.properties && (
                            <div className="flex flex-center flex-col mx-4">
                              <div className="p-2">Outputs</div>
                              <Separator/>
                                 <div className="grid grid-cols-1">{asset.metadata.operation?.output?.properties && 
                                 
                                 renderJSONMap(asset.metadata.operation?.output?.properties)
                                   
                                 }
                                 </div>
                          </div>  
                        )}
                    <SheetFooter>
                      <SheetClose asChild>
                      {asset.id && asset.metadata?.operation?.input && <Button type="submit"  onClick={() => {redirect("/venues/default/operations/"+asset.id)}}>Run</Button>}
                    </SheetClose>
                  </SheetFooter>
                       </SheetContent>
                        <CardContent className="flex flex-col px-2"> 
                                <div className="text-xs text-slate-600 line-clamp-1">{asset.metadata.description}</div>
                                <div className="flex flex-row items-center justify-between mt-4">
                                    <CircleArrowRight onClick={() => {redirect("/venues/default/operations/"+asset.id)}}/>
                                </div>
                          </CardContent>
                    </Card> 
                    </Sheet>          
                         
              ))}
              {isLoading && <div>Loading</div>}
             </div>
              
             </div>
    </ContentLayout>
  );
}
