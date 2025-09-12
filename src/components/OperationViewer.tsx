
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
  const [asset, setAsset] = useState<Asset>();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [buttonText, setButtonText] = useState("Run");
  const [valueMap, setValueMap] = useState(new Map());
  const [assetNotFound, setAssetNotFound] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());

  if (!venueObj) return null;
  const venue = useMemo(() => {
        // Your expensive calculation or value creation
        return new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})
        }, []); // Dependency array

  useEffect(() => {
    setAssetNotFound(false);
    setErrorMessage("");
    venue.getAsset(props.assetId)
      .then((asset: Asset) => {
        setAsset(asset);
      })
      .catch((e: Error) => {
        if (e?.message && (e.message.includes('404') || e.message.toLowerCase().includes('not found'))) {
          setAssetNotFound(true);
          return;
        }
        setErrorMessage(e?.message || 'Failed to load asset');
      });

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
        
          if (asset && asset.metadata?.operation) {
              response = await asset.run(inputs);
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
            if (asset && asset.metadata?.operation) {
                setLoading(true)
                response = await asset.run(inputs);
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
  function renderInputComponent(
    key: string, 
    type: string, 
    defaultValue: string, 
    placeholder: string, 
    description: string, 
    isRequired: boolean,
    setKeyValue: (key: string, value: [string, string]) => void
  ) {
    const commonProps = {
      className: "my-2 flex-1 w-48 placeholder:text-gray-500",
      defaultValue,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const valueType = type === "object" || type === "any" ? "json" : type;
        setKeyValue(key, [valueType, e.target.value]);
      }
    };

    const descriptionElement = (
      <div className="text-sm text-gray-600 ml-2 w-48">{description}</div>
    );

    if (type === "string") {
      return (
        <>
          <Input {...commonProps} required={isRequired} type="text" />
          {descriptionElement}
        </>
      );
    }

    if (type === "asset") {
      return (
        <>
          <Input {...commonProps} type="text" />
          {descriptionElement}
        </>
      );
    }

    if (type === "number") {
      return (
        <>
          <Input {...commonProps} type="text" />
          {descriptionElement}
        </>
      );
    }

    if (type === "json" || type === "object" || type === "any") {
      return (
        <>
          <Textarea {...commonProps} rows={5} />
          {descriptionElement}
        </>
      );
    }

    return null;
  }

  function renderInputFields(operation: JSON, requiredKeys: string[]) {
    if (operation != null && operation != undefined) {
      const keys = Object.keys(operation);
      const type = new Array<string>();
      const description = new Array<string>();
      const defaultValue = new Array<string>();
      const exampleValue = new Array<string>();

      keys.map((key, index) => {
        const jsonValue = operation[key];
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
              {renderInputComponent(
                key,
                type[index],
                defaultValue[index],
                exampleValue[index],
                description[index],
                requiredKeys?.indexOf(key) !== -1,
                setKeyValue
              )}
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
      <SmartBreadcrumb assetName={asset?.metadata?.name} />

      <div className="flex flex-col w-full items-center justify-center">
        {assetNotFound && (
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Asset Not Found</h2>
            <p className="text-gray-600">The asset ID &quot;{props.assetId}&quot; does not exist on this venue.</p>
          </div>
        )}
        
        {!assetNotFound && asset && <AssetHeader asset={asset} />}
        {!assetNotFound && asset && <MetadataViewer asset={asset} />}
        {!assetNotFound && asset?.metadata?.operation && (
          <>
            {renderInputFields(asset?.metadata?.operation?.input?.properties, asset?.metadata?.operation?.input?.required)}
            {asset?.metadata?.operation?.steps && <DiagramViewer metadata={asset.metadata}></DiagramViewer>}
          </>
        )}
        {!assetNotFound && asset && !asset?.metadata?.operation && (
          <div className="text-center p-4">
            <p className="text-red-500">This asset is not an operation and cannot be executed.</p>
          </div>
        )}
      </div>
    </>
  );
};

