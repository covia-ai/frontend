
'use client'


import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia/covialib";
import { Calendar, Copy, CopyCheck, Copyright, EyeIcon, Hash, Info, InfoIcon, Map, Tag, User, View } from "lucide-react";
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
import { ContentViewer } from "./ContentViewer";
import { JsonEditor } from "json-edit-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { copyDataToClipBoard } from "@/lib/utils";

export const AssetViewer = (props:any) => {
      
      const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
      const [content, setContent] = useState("");

      const venue = useStore(useVenue, (x) => x).venue;
      if (!venue) return null;
                           
        useEffect(() => {
              venue.getAsset(props.assetId).then(( asset:Asset) => {
                  setAssetsMetadata(asset);
                  
            })
      }, []);
      async function readStream(reader: ReadableStreamDefaultReader) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('Stream finished.');
            break;
          }

          // Process the 'value' (Uint8Array) chunk
          // For text data, you might decode it:
          const jsonString = Buffer.from(value)


          console.log(jsonString)
          const textChunk = new TextDecoder().decode(value);
          setContent(textChunk);
        }
      }
    
      useEffect(() => {
              console.log(assetsMetadata)
              assetsMetadata?.getContent().then(( content) => {
                  console.log(readStream(content?.getReader()))
                  
            })
      }, [assetsMetadata]);

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
                    <div className="flex flex-row-reverse space-x-4 space-x-reverse w-full"> 
                      <div className="flex flex-row space-x-2 ">
                        <span > AssetId </span>
                        <span><Copy onClick={ (e) => copyDataToClipBoard(assetsMetadata?.id,"AssetId copied to clipboard")}></Copy></span>
                      </div>
                      <div className="flex flex-row space-x-2 ">
                        <span> Asset Link </span>
                        <span><Copy onClick={ (e) => copyDataToClipBoard(window.location.href, "Asset Link copied to clipboard")}></Copy></span>
                    
                      </div>
                    </div>
                  <div className="flex flex-col border-1 shadow-md rounded-md border-slate-200  mt-8 p-4 items-center justify-between min-w-lg">
                    
                    <div className="flex flex-row">
                      <div className="flex flex-col min-w-lg border-r-2 border-slate-200 px-2 ">
                          <div className="flex flex-row items-center space-x-2 my-4">
                            <Map size={18}></Map>
                            <span><strong>Venue:</strong></span>
                            <span><Link href="/venues/default" className="hover:underline hover:text-pink-600"> {assetsMetadata?.venue?.venueId}</Link></span>
                          </div>
                          {assetsMetadata?.metadata?.creator && <div className="flex flex-row items-center space-x-2 my-4">
                            <User  size={18}></User>
                            <span><strong>Creator:</strong>  </span>
                            <span>{assetsMetadata?.metadata?.creator}</span>
                          </div>}
                          <div className="flex flex-row items-center space-x-2 my-4">
                            <Copyright size={18}></Copyright>
                            <span><strong>License: </strong>  </span>
                            <span><Link className="hover:text-pink-400 hover:underline" href={assetsMetadata?.metadata?.license?.url}>{assetsMetadata?.metadata?.license?.name}</Link></span>
                          </div> 
                          {assetsMetadata?.metadata?.dateCreated && <div className="flex flex-row items-center space-x-2 my-4">
                            <Calendar size={18}></Calendar>
                            <span><strong>Created on:</strong>  </span>
                            <span>{assetsMetadata?.metadata?.dateCreated}</span>
                          </div>}
                          {assetsMetadata?.metadata?.dateModified && <div className="flex flex-row items-center space-x-2 my-4">
                            <Calendar size={18}></Calendar>
                            <span><strong>Modified on:</strong>  </span>
                            <span>{assetsMetadata?.metadata?.dateModified}</span>
                          </div>   }      
                      </div>  
                      <div className="flex flex-col min-w-lg px-2 ">
                          {assetsMetadata?.metadata?.keyword && <div className="flex flex-row items-center space-x-2 my-4">
                              <Tag size={18}></Tag>
                              <span><strong>Keywords:</strong> </span>
                              <span className="space-x-2">{assetsMetadata?.metadata?.keywords?.map((keyword,index) => (
                                  <Badge variant="secondary" key={index}>{keyword}</Badge>
                              ))}</span>
                          </div>}
                          {assetsMetadata?.metadata?.additionalInformation?.notes && <div className="flex flex-row items-center space-x-2">
                            <InfoIcon size={18}></InfoIcon>
                            <span><strong>Comment:</strong></span>
                            <span>{assetsMetadata?.metadata?.additionalInformation?.notes}</span>
                          </div>}
                          {content?.length> 0 && <div className="flex flex-row items-center space-x-2 my-4">
                                <EyeIcon size={18}></EyeIcon>
                                <span><strong>Data:</strong></span>
                                <span><ContentViewer title={"Content"} data={content }></ContentViewer></span>   
                          </div>}
                          <div className="flex flex-row items-center space-x-2">
                                <Info size={18}></Info>
                                <span><strong>Metadata:</strong></span>
                                <span>
                                  <Dialog>
                                    <DialogTrigger>
                                        <span className="text-pink-400 underline"> Click to load metadata</span>

                                    </DialogTrigger>
                                    <DialogContent>

                                      <JsonEditor data={assetsMetadata?.metadata}
                                                                          rootName="metadata"
                                                                          rootFontSize="1em"
                                                                          maxWidth="90vw"
                                                                          restrictEdit={true}
                                                                          restrictAdd={true}
                                                                          restrictDelete={true}
                                                                            collapse={1}
                                                                        /> 
                                    </DialogContent>
                                    </Dialog>
                                    
                                </span>   
                          </div>  
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

