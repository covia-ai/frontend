
'use client'
/* eslint-disable */

import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia/covialib";
import { Calendar, Copy, CopyCheck, Copyright, Download, EyeIcon, Hash, Info, InfoIcon, Map, Tag, User, View } from "lucide-react";
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
import { JsonEditor } from "json-edit-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { copyDataToClipBoard } from "@/lib/utils";
import { Table, TableCell, TableHead, TableRow } from "./ui/table";

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
             /* assetsMetadata?.getContent().then(( content) => {
                  console.log(readStream(content?.getReader()))
                  
            })*/
           let contentDownloadUrl = venue.baseUrl+"/api/v1/assets/"+assetsMetadata?.id+"/content";
           console.log(contentDownloadUrl)
           setContent(contentDownloadUrl)
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
                    <h3 className="text-center text-wrap text-xl md:text-4xl font-bold lg:px-10 md:px-10">
                        {assetsMetadata.metadata?.name}
                    </h3>
                   <p className="mb-4 text-wrap w-1/2"> {assetsMetadata.metadata?.description}</p>

                   {/* Links to the asset and the asset id*/}
                   <div className="flex flex-row-reverse space-x-4 space-x-reverse w-full mb-2"> 
                      <div className="flex flex-row text-xs ">
                        <span><a href={window.location.href} className="hover:text-pink-400 hover:underline">Asset Link </a></span>
                        <span><Copy size={12} onClick={ (e) => copyDataToClipBoard(window.location.href, "Asset Link copied to clipboard")}></Copy></span>
                     
                      </div>
                       <div className="flex flex-row ">
                        <span className="text-xs">{assetsMetadata?.id} </span>
                        <span><Copy size={12} onClick={ (e) => copyDataToClipBoard(assetsMetadata?.id, "AssetId copied to clipboard")}></Copy></span>
                      </div>
                    </div>
                  <div className="flex flex-col border-1 shadow-md rounded-md border-slate-200 p-2 items-center justify-between min-w-lg w-11/12">
                     
                    <div className="flex flex-row">
                      <div className="flex flex-col min-w-lg border-r-2 border-slate-200 px-2 ">
                          
                          {assetsMetadata?.metadata?.creator && <div className="flex flex-row items-center space-x-2 my-4">
                            <User  size={18}></User>
                            <span><strong>Creator:</strong>  </span>
                            <span>{assetsMetadata?.metadata?.creator}</span>
                          </div>}
                          {assetsMetadata?.metadata?.license && <div className="flex flex-row items-center space-x-2 my-4">
                            <Copyright size={18}></Copyright>
                            <span><strong>License: </strong>  </span>
                            <span><Link className="hover:text-pink-400 hover:underline" href={assetsMetadata?.metadata?.license?.url}>{assetsMetadata?.metadata?.license?.name}</Link></span>
                          </div>}
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
                                <Download size={18}></Download>
                                <span><strong>Data:</strong></span>
                                <span><Link href={content} className="text-pink-400 underline" >Click to download content</Link></span>   
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
                  <div className="flex flex-row items-center space-x-2 my-2 text-xs text-slate-800">
                            <span>Venue:</span>
                            <span><Link href="/venues/default" className="hover:underline hover:text-pink-600"> {assetsMetadata?.venue?.venueId}</Link></span>
                  </div>
                  </div>
                </div>
            )  
            }      
        </>
           
      );
};

