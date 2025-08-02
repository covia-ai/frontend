
'use client'
/* eslint-disable */

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label"

import { useEffect, useState } from "react";
import {  Operation } from "@/lib/covia/covialib";
import { redirect } from "next/navigation";
import { copyDataToClipBoard } from "@/lib/utils";


import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"



import Link from "next/link";
import { Textarea } from "./ui/textarea";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { DiagramViewer } from "./DiagramViewer";
import { Copy, CopyCheck } from "lucide-react";
import copy from 'copy-to-clipboard';
import { toast } from "sonner"

export const OperationViewer = (props:any) => {
        const [assetsMetadata, setAssetsMetadata] = useState<Operation>();
        const [errorMessage, setErrorMessage] = useState("");
        const [loading, setLoading] = useState(false);
        const valueMap = new Map();
        const venue = useStore(useVenue, (x) => x).venue;
        if (!venue) return null;
        
        
        useEffect(() => {
              venue.getAsset(props.assetId).then(( asset:Operation) => {
                  setAssetsMetadata(asset);
            
          })
         
      }, []);
       
     

      function setKeyValue(key,value) {
          valueMap.set(key,value);
      }
      async function invokeOp(id, requiredKeys:string[]= []) {
        setLoading(true)
        let operationStatus= true;
        for(let index=0;index<requiredKeys.length;index++) {
           if(!valueMap.has(requiredKeys[index]))
            operationStatus = false;
        }
        console.log(operationStatus)
        if(operationStatus) {
          let inputs = {};
          for (const [key, value] of valueMap) {
            inputs[key] = value;
          }
          let response = {};
          try {
            let payload = {
              "operation" : id,
              "input": inputs
            }
            console.log(assetsMetadata)
            response = await assetsMetadata?.invoke(payload);
          
          }
          catch(e : Error) {
            console.log(e)
            setErrorMessage(e.message);
             setLoading(false);
          }
        if(response?.id) {
            redirect("/runs/"+response?.id);
          } 
        } else {
          setErrorMessage("Please provide all the inputs")
          setLoading(false);
        }
      }
      function renderJSONMap(jsonObject:JSON, requiredKeys: string[]) {
        if(jsonObject != null && jsonObject != undefined) {
          let keys = Object.keys(jsonObject);
          let type = new Array<string>();
          let description = new Array<string>();

          keys.map((key, index) => {
              let jsonValue = jsonObject[key];
              type[index] = jsonValue.type;
              description[index] = jsonValue.description;
          });
        
          return (
                    <div className="flex flex-col w-full space-x-2 my-2">
                      <div className="flex flex-col w-full space-x-2 my-2 items-center justify-center">
                          {keys.map((key, index) => (
                              <div key={index} className="flex flex-row space-x-2 w-full">
                                
                                <Label>{key.toUpperCase()} </Label>
                                {requiredKeys != undefined && requiredKeys?.indexOf(key) != -1 && <span className="text-red-400">*</span>}
                                {type[index]=="string" && (
                                  <>
                                  
                                  <Input  className="my-2"
                                    required={true}
                                    onChange={e => setKeyValue(key,e.target.value)}
                                    type="text" placeholder={description[index]}></Input>
                                  
                                  </>
                                )
                                }
                                {type[index]=="asset" &&
                                <Input className="my-2" type="text"
                                  onChange={e => setKeyValue(key,e.target.value)}
                                  placeholder={description[index]}></Input>
                                }
                                {type[index]=="json" && 
                                <Textarea className="my-2" rows={5} cols={200} 
                                onChange={e => setKeyValue(key,e.target.value)}
                                placeholder={description[index]}></Textarea>
                                }
                                 {type[index]=="object" && 
                                <Textarea className="my-2" rows={5} cols={200} 
                                onChange={e => setKeyValue(key,e.target.value)}
                                placeholder={description[index]}></Textarea>
                                }
                                {type[index]=="number" && 
                                 <Input className="my-2" type="text"
                                  onChange={e => setKeyValue(key,e.target.value)}
                                  placeholder={description[index]}></Input>
                                }
                              </div>
                          ))}
                          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
                         {!loading && <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>Run</Button>}
                         {loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}
                      </div>
                    </div>
                  )
        }
        else {
          return  (
                  <div className="flex flex-col items-center justify-center w-full space-x-2 my-2">
                    <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
                    {!loading && <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>Run</Button>}
                    {loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}
                  </div>
                  )
        }
      }
      
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
                  <Link href="/operations">Operations</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{assetsMetadata?.metadata?.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
            </Breadcrumb>
             
            
                
                <div className="flex flex-col w-full items-center justify-center">
                   <h2 className="text-lg text-semibold my-2">{assetsMetadata?.metadata?.name}</h2>
                   <p className="text-sm  mb-4 text-slate-600">{assetsMetadata?.metadata?.description}</p>
                   <div className="flex flex-row-reverse space-x-4 space-x-reverse w-full"> 
                     
                      <div className="flex flex-row text-xs ">
                        <span> {(window.location.href).slice(0,60)+"..."} </span>
                        <span><Copy size={12} onClick={ (e) => copyDataToClipBoard(window.location.href, "Asset Link copied to clipboard")}></Copy></span>
                     
                      </div>
                       <div className="flex flex-row ">
                        <span className="text-xs">{assetsMetadata?.id.slice(0,60)+"..."} </span>
                        <span><Copy size={12} onClick={ (e) => copyDataToClipBoard(assetsMetadata?.id, "AssetId copied to clipboard")}></Copy></span>
                      </div>
                    </div>
                  {renderJSONMap(assetsMetadata?.metadata?.operation?.input?.properties, assetsMetadata?.metadata?.operation?.input?.required)}
                  {assetsMetadata?.metadata?.operation?.steps && <DiagramViewer metadata={assetsMetadata.metadata}></DiagramViewer>}
                </div>
            
             
                
             
        </>
           
      );
};

