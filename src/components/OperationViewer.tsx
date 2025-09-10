
'use client'

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label"

import { useEffect, useMemo, useState } from "react";
import { Operation, Venue } from "@/lib/covia";
import { useRouter } from "next/navigation";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb"
import { Textarea } from "./ui/textarea";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { DiagramViewer } from "./DiagramViewer";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { Asset } from "@/lib/covia";
import { usePathname } from "next/navigation";

export const OperationViewer = (props: any) => {
  const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [buttonText, setButtonText] = useState("Run");
  const [valueMap, setValueMap] = useState(new Map());
  const router = useRouter();
  const pathname = usePathname();
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());

  if (!venueObj) return null;
  const venue = useMemo(() => {
        // Your expensive calculation or value creation
        return new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})
        }, []); // Dependency array

  useEffect(() => {
    venue.getAsset(props.assetId).then((asset: Asset) => {
      setAssetsMetadata(asset);

    })

  }, [props.assetId, venue]);



  function setKeyValue(key, value) {
    const newMap = new Map(valueMap);
    newMap.set(key,value);
    setValueMap(newMap)

  }
  async function resetForm() {
    window.location.href=pathname;
  }
  async function invokeOp(id, requiredKeys: string[] = []) {
    const inputs = {};
    //First attempt , do all validations and inform user of operation inputs
    if(buttonText == "Run" ) {
      //Check if any inputs are provided by user
      try {
        if(valueMap && valueMap.size>0) {    
          //Check if all required values are provided
          for (let index = 0; index < requiredKeys.length; index++) {
            if (!valueMap.has(requiredKeys[index])) {
              throw new Error("The input \""+requiredKeys[index]+"\" is expected as per the operation schema. please verify before running the operation");
            }
          
          }
          //Check if inputs are valid as per expected type mainly json 
          for (const [key, value] of valueMap) {
                if (value[0] == "json" || value[0] == "object" || value[0] == "any") {
                  try {
                    inputs[key] = JSON.parse(value[1]);
                  }
                  catch(e) {
                    console.log(key)
                    if(key != "none")
                        throw new Error("Operation input \""+key+"\" expects a valid Json value, please verify before running the operation");
                    else 
                        throw new Error("Operation input expects a valid Json value, please verify before running the operation");
                  }
                }
                else if (value[0] == "number") {
                  try {
                    inputs[key] = Number(value[1]);
                  }
                  catch(e) {
                    throw new Error("Key "+key+" expects a number, please verify before running the operation");
                  }

                }
                else
                  inputs[key] = value[1];
          }
          let response = "";
        
          if (assetsMetadata && assetsMetadata.metadata?.operation) {
              response = await assetsMetadata.run(inputs);
              if (response?.id) {
              router.push("/history/" + response?.id);
            }
          } else {
            throw new Error("This asset is not an operation and cannot be invoked");
          }
        } 
         else {
         //No inputs provided
          throw Error("No inputs provided for the operation, please verify before running the operation");
        }    
      }
      catch (e: Error) {
            console.log(e)
            setErrorMessage(e.message);
            setButtonText("Run anyway?")
            setLoading(false);
        }
    }
    //Second attempt, we do not do any validation just run the operations
    else {
          for (const [key, value] of valueMap) {      
                   inputs[key] = value[1];
          }
          console.log(inputs)
          let response = "";
           try {
            if (assetsMetadata && assetsMetadata.metadata?.operation) {
                setLoading(true)
                response = await assetsMetadata.run(inputs);
                if (response?.id) {
                router.push("/history/" + response?.id);
               }
            } else {
               throw new Error("This asset is not an operation and cannot be invoked");
            }
          }  
          catch(e) {
               setErrorMessage(e.message)
               setLoading(false);
          }
    }
    
  }
  function renderJSONMap(jsonObject: JSON, requiredKeys: string[]) {
    if (jsonObject != null && jsonObject != undefined) {
      const keys = Object.keys(jsonObject);
      const type = new Array<string>();
      const description = new Array<string>();
      const defaultValue = new Array<string>();
      const exampleValue = new Array<string>();

      keys.map((key, index) => {
        const jsonValue = jsonObject[key];
        type[index] = jsonValue.type;
        description[index] = jsonValue.description;
        defaultValue[index] = jsonValue.default || "";
        exampleValue[index] = jsonValue.examples ? `e.g. ${Array.isArray(jsonValue.examples) ? jsonValue.examples[0] : jsonValue.examples}` : "";
      });
      return (
        <div className="flex flex-col w-11/12 space-x-2 my-2 items-center justify-center">
          {keys.map((key, index) => (
            <div key={index} className="flex flex-row space-x-2 w-full items-center">

              <div  className="flex flex-row w-20">
                <Label>{key} </Label>
                {requiredKeys != undefined && requiredKeys?.indexOf(key) != -1 && <span className="text-red-400">*</span>}
              </div>
              {type[index] == "string" && (
                <>
                  <Input className="my-2 flex-1 w-48 placeholder:text-gray-500"
                    required={true}
                    defaultValue={defaultValue[index]}
                    placeholder={exampleValue[index]}
                    onChange={e => setKeyValue(key, ["string", e.target.value])}
                    type="text"></Input>
                  <div className="text-sm text-gray-600 ml-2 w-48 ">{description[index]}</div>
                </>
              )
              }
              {type[index] == "asset" &&
                <>
                  <Input className="my-2 flex-1 w-48 placeholder:text-gray-500" type="text"
                    defaultValue={defaultValue[index]}
                    placeholder={exampleValue[index]}
                    onChange={e => setKeyValue(key, ["asset", e.target.value])}></Input>
                  <div className="text-sm text-gray-600 ml-2 w-48 ">{description[index]}</div>
                </>
              }
              {type[index] == "json" &&
                <>
                  <Textarea className="my-2 flex-1 w-48 placeholder:text-gray-500" rows={5} 
                    defaultValue={defaultValue[index]}
                    placeholder={exampleValue[index]}
                    onChange={e => setKeyValue(key, ["json", e.target.value])}></Textarea>
                  <div className="text-sm text-gray-600 ml-2 w-48 ">{description[index]}</div>
                </>
              }
              {type[index] == "object" &&
                <>
                  <Textarea className="my-2 flex-1 w-48 placeholder:text-gray-500" rows={5}
                    defaultValue={defaultValue[index]}
                     placeholder={exampleValue[index]}
                    onChange={e => setKeyValue(key, ["json", e.target.value])}></Textarea>
                  <div className="text-sm text-gray-600 ml-2 w-48">{description[index]}</div>
                </>
              }
               {type[index] == "any" &&
                <>
                  <Textarea className="my-2 flex-1 w-48 placeholder:text-gray-500" rows={5}
                    defaultValue={defaultValue[index]}
                    placeholder={exampleValue[index]}
                    onChange={e => setKeyValue(key, ["json", e.target.value])}></Textarea>
                  <div className="text-sm text-gray-600 ml-2 w-48">{description[index]}</div>
                </>
              }
              {type[index] == "number" &&
                <>
                  <Input className="my-2 flex-1 w-48 placeholder:text-gray-500" type="text"
                    defaultValue={defaultValue[index]}
                    placeholder={exampleValue[index]}
                    onChange={e => setKeyValue(key, ["number", e.target.value])}></Input>
                  <div className="text-sm text-gray-600 ml-2 w-48">{description[index]}</div>
                </>
              }
            </div>
          ))}
          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
          <div className="flex flex-row space-x-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>{buttonText}</Button>}
          {!loading && <Button type="button" className="w-32" onClick={() => resetForm()}>Reset</Button>}
          </div>

          {loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}
        </div>
      )
    }
    else {
      return (
        <div className="flex flex-col items-center justify-center w-full space-x-2 my-2">

          <Textarea className="my-2 flex-1 placeholder:text-gray-500" rows={5} cols={200}
            onChange={e => setKeyValue("none",["any",e.target.value])}
            placeholder="e.g. Provide input here"></Textarea>

          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
           <div className="flex flex-row space-x-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>{buttonText}</Button>}
          {!loading && <Button type="button" className="w-32" onClick={() => resetForm()}>Reset</Button>}
          </div>
          {loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}
        </div>
      )
    }
  }

  return (
    <>
      <SmartBreadcrumb />

      <div className="flex flex-col w-full items-center justify-center">
        
        {assetsMetadata && <AssetHeader asset={assetsMetadata} />}
        {assetsMetadata && <MetadataViewer asset={assetsMetadata} />}
        {assetsMetadata?.metadata?.operation && (
          <>
            {renderJSONMap(assetsMetadata?.metadata?.operation?.input?.properties, assetsMetadata?.metadata?.operation?.input?.required)}
            {assetsMetadata?.metadata?.operation?.steps && <DiagramViewer metadata={assetsMetadata.metadata}></DiagramViewer>}
          </>
        )}
        {!assetsMetadata?.metadata?.operation && (
          <div className="text-center p-4">
            <p className="text-red-500">This asset is not an operation and cannot be executed.</p>
          </div>
        )}
      </div>
    </>
  );
};

