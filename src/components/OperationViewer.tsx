
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
        
        // Pre-populate defaults into valueMap
        if (asset?.metadata?.operation?.input?.properties) {
          const properties = asset.metadata.operation.input.properties;
          Object.keys(properties).forEach(key => {
            const property = properties[key];
            if (property.default !== undefined) {
              setKeyValue(key, property.default);
            }
          });
        }
      })
      .catch((e: Error) => {
        if (e?.message && (e.message.includes('404') || e.message.toLowerCase().includes('not found'))) {
          setAssetNotFound(true);
          return;
        }
        setErrorMessage(e?.message || 'Failed to load asset');
      });

  }, [props.assetId, venue]);

  function setKeyValue(key: any, value: any) {
    const newMap = new Map(valueMap);
    newMap.set(key, value);
    setValueMap(newMap)
  }

  async function resetForm() {
    window.location.href=pathname;
  }

  async function invokeOp(id: any, requiredKeys: string[] = []) {
    const inputs: Record<string, any> = {};
    
    // Helper function to process a value based on its schema type
    const processValue = (key: string, value: any) => {
      const schemaProperty = asset?.metadata?.operation?.input?.properties?.[key];
      const type = schemaProperty?.type || "string";
      
      if (type === "json" || type === "object" || type === "any") {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch(e) {
            throw new Error("Operation input \""+key+"\" expects a valid Json value, please verify before running the operation");
          }
        }
        return value;
      } else if (type === "number") {
        return Number(value);
      } else {
        return value;
      }
    };

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
          
          //Process all values from valueMap
          for (const [key, value] of valueMap) {
            inputs[key] = processValue(key, value);
          }
          
          let response: any = "";
        
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
      catch (e: any) {
            console.log(e)
            setErrorMessage(e.message);
            setButtonText("Run anyway?")
            setLoading(false);
        }
    }
    //Second attempt, we do not do any validation just run the operations
    else {
          for (const [key, value] of valueMap) {      
                   inputs[key] = processValue(key, value);
          }
          let response: any = "";
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
           catch(e: any) {
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
    setKeyValue: (key: string, value: any) => void
  ) {
    const commonProps = {
      className: "my-2 flex-1 w-48 placeholder:text-gray-500",
      defaultValue,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setKeyValue(key, e.target.value);
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
        const jsonValue = (operation as any)[key];
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
          <div className="flex flex-row space-x-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(asset?.id, requiredKeys)}>{buttonText}</Button>}
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
            onChange={e => setKeyValue("none", e.target.value)}
            placeholder="e.g. Provide input here"></Textarea>

          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
           <div className="flex flex-row space-x-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(asset?.id, requiredKeys)}>{buttonText}</Button>}
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

