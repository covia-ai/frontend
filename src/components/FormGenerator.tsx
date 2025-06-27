
'use client'
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label"

import { useEffect, useState } from "react";
import {  Venue,Operation, CoviaError, Asset } from "@/lib/covia/covialib";
import { redirect } from "next/navigation";


import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"

import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"

import Link from "next/link";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogClose } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
export const FormGenerator = (props:any) => {
        const [venue, setVenue] = useState<Venue>();
        const [assetsMetadata, setAssetsMetadata] = useState<Operation>();
        const [assetIds, setAssetIds] = useState([]);
        const [errorMessage, setErrorMessage] = useState("");
        const valueMap = new Map();

        useEffect(() => {
          const venue = new Venue();
          venue.connect().then((venueObj) => {
              setVenue(venue);
              venueObj.getOperation(props.assetId).then(( asset:Operation) => {
                  setAssetsMetadata(asset);
            })
          })
          venue.connect().then((venueObj) => {
              venueObj.getAssets().then(( assetObj) => {
                  setAssetIds(assetObj);
            })
          })
      }, []);
            
      function setKeyValue(key,value) {
          valueMap.set(key,value);
      }
      async function invokeOp(id, requiredKeys:string[]= []) {
        console.log(valueMap)
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
          }
        if(response?.id) {
            redirect("/runs/"+response?.id);
          } 
        } else {
          setErrorMessage("Please provide all the inputs")
        }
      }
      function renderJSONMap(jsonObject:JSON, requiredKeys: string[]) {
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
                            <div className="flex flex-row space-x-2 w-full">
                              
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
                            </div>
                         ))}
                         <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
                        <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>Run</Button>
                     </div>
                  </div>
                )
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
                <BreadcrumbPage>{assetsMetadata?.metadata.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
             
              {assetsMetadata && (
                
                <div className="flex flex-col w-full items-center justify-center">
                   <h2 className="text-lg text-semibold my-2">{assetsMetadata?.metadata?.name}</h2>
                   <p className="text-sm  mb-4 text-slate-600">{assetsMetadata?.metadata?.description}</p>
                  {renderJSONMap(assetsMetadata?.metadata?.operation?.input?.properties, assetsMetadata?.metadata?.operation?.input?.required)}
                </div>
              )  
              }
            
             
             
        </>
           
      );
};

