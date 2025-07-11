
'use client'


import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia/covialib";
import { Calendar, Copyright, EyeIcon, InfoIcon, Map, Tag, User } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Badge } from "./ui/badge";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";

export const AssetViewer = (props:any) => {
      
      const [assetsMetadata, setAssetsMetadata] = useState<Asset>();

      const venue = useStore(useVenue, (x) => x).venue;
      if (!venue) return null;
                           
        useEffect(() => {
              venue.getAsset(props.assetId).then(( asset:Asset) => {
                  console.log(asset)
                  setAssetsMetadata(asset);
           
          })
      }, []);
            
     
        return (
           <>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/assets">Assets</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage> {assetsMetadata?.metadata?.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              {assetsMetadata && (
                
                <div className="flex flex-col w-full items-center justify-center">
                  <div className="flex flex-col items-center justify-center">
                    <h3 className="text-center text-xl md:text-4xl font-bold lg:px-10 md:px-10">
                        {assetsMetadata.metadata?.name}
                    </h3>
                   <p className="mt-4"> {assetsMetadata.metadata?.description}</p>
                <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-11/12 mt-8 p-4 items-center justify-between">
                  <div className="flex flex-col w-1/2 border-r-2 border-slate-200 px-2">
                
                    <div className="flex flex-row items-center space-x-2">
                      <Map size={18}></Map>
                      <span><strong>Venue:</strong></span>
                      <span><Link href="/venues/default" className="hover:underline hover:text-pink-400"> {assetsMetadata?.venue?.venueId}</Link></span>
                    </div>
                    <div className="flex flex-row items-center space-x-2">
                      <User  size={18}></User>
                      <span><strong>Creator:</strong>  </span>
                      <span>{assetsMetadata?.metadata?.creator}</span>
                    </div>
                    <div className="flex flex-row items-center space-x-2">
                      <Copyright size={18}></Copyright>
                      <span><strong>License:</strong>  </span>
                      <span>{assetsMetadata?.metadata?.license?.name}</span>
                    </div> 
                    <div className="flex flex-row items-center space-x-2">
                      <Calendar size={18}></Calendar>
                      <span><strong>Created on:</strong>  </span>
                      <span>{assetsMetadata?.metadata?.dateCreated}</span>
                    </div> 
                     <div className="flex flex-row items-center space-x-2">
                      <Calendar size={18}></Calendar>
                      <span><strong>Created on:</strong>  </span>
                      <span>{assetsMetadata?.metadata?.dateModified}</span>
                    </div>         
                  </div>  
                   <div className="flex flex-col w-1/2 px-2 ">
                       <div className="flex flex-row items-center space-x-2">
                          <Tag size={18}></Tag>
                          <span><strong>Keywords:</strong> </span>
                          <span className="space-x-2">{assetsMetadata?.metadata?.keywords?.map((keyword,index) => (
                              <Badge variant="secondary" key={index}>{keyword}</Badge>
                          ))}</span>
                      </div>
                      <div className="flex flex-row items-center space-x-2">
                        <InfoIcon size={18}></InfoIcon>
                        <span><strong>Comment:</strong></span>
                        <span>{assetsMetadata?.metadata?.additionalInformation?.notes}</span>
                    
                       
                      </div>
                            <div className="flex flex-row items-center space-x-2">
                        <EyeIcon size={18}></EyeIcon>
                        <span><strong>Data:</strong></span>
                        <span>{assetsMetadata?.metadata?.content?.contentType}</span>
                    
                       
                      </div>  
               </div>  
              </div>
             
              </div>
              </div>
            )  
            }      
        </>
           
      );
};

