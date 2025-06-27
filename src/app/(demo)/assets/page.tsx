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
import {  CircleArrowRight, Copy, CopyIcon, Save } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { Venue,Asset } from "@/lib/covia/covialib";
import { JsonEditor } from "json-edit-react";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');

 // const [venue, setVenue] = useState<Venue>();
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [newJsonData, setNewJsonData] = useState({});
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();
  const venueStore = useStore(useVenue, (x) => x);
  if (!venueStore) return null;

      function fetchAssets() {
            venueStore.venue.connect().then((venueObj) => {
              venueObj.getAssets().then(( assetsObj) => {
                for(let index=0;index<assetsObj.length;index++) {
                  venueStore.venue?.getAsset(assetsObj[index]).then((asset: Asset) => {
                     if(asset.getMetadata().operation == undefined && asset.getMetadata().name != undefined) {
                       setAssetsMetadata(prevArray => [...prevArray, asset]);
                    }
                  })
                }
             })
           })
          }
      useEffect(() => {
           
           
          fetchAssets();
      }, []);
       
      
         useEffect(() => {
           setLoading(false);
        },[assetsMetadata]);

  function createNewAsset() {
    try {
      console.log(newJsonData)
      console.log(venueStore)
      venueStore.venue?.createAsset(newJsonData).then( (assetId) => {
            console.log(assetId);
            setNewJsonData({})
             if(assetId) {
                     fetchAssets();
              }
      })
    }
    catch(error) {
      console.log(error);
    }
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
              <Search/>
              {!isLoading && <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center gap-4">
              {assetsMetadata.map((asset, index) => ( 
                  
                   <Card key={index} className="px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl ">
                        <CardTitle  className="px-2 flex flex-row items-center justify-between">

                           <div>{asset.metadata.name}</div>
                          <Dialog>
                                 <DialogTrigger><CopyIcon></CopyIcon></DialogTrigger>
                                 <DialogContent className="h-11/12 min-w-10/12 ">
                                  <DialogTitle className="flex flex-row items-center justify-between mr-4">
                                      Copy asset 
                                       <DialogClose>
                                        {JSON.stringify(newJsonData) != "{}" && 
                                        <Button type="button" onClick={() => createNewAsset()}> <Save></Save></Button>
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
                                <div className="flex flex-row items-center justify-between mt-4">
                                    <CircleArrowRight onClick={() => {redirect("/venues/default/assets/"+asset.id)}}/>
                                </div>
                          </CardContent>
                        </Card>           
                         
                 ))}
             
             </div>}
              {isLoading && <div>Loading...</div>}
             </div>
    </ContentLayout>
  );
}
