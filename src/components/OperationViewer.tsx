
'use client'

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
  const [input, setInput] = useState(new Map()); // input values to be passed to the operation
  const [typeMap, setTypeMap] = useState(new Map()); // user-specified types of the values to be passed to the operation, affects parsing
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
        
        // Pre-populate defaults into valueMap and types into typeMap
        if (asset?.metadata?.operation?.input?.properties) {
          const properties = asset.metadata.operation.input.properties;
          Object.keys(properties).forEach(key => {
            const property = properties[key];
            if (property.default !== undefined) {
              setKeyValue(key, property.default);
            }
            if (property.type !== undefined) {
              setKeyType(key, property.type);
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
    const newMap = new Map(input);
    newMap.set(key, value);
    setInput(newMap)
  }

  function setKeyType(key: any, type: any) {
    const newMap = new Map(typeMap);
    newMap.set(key, type);
    setTypeMap(newMap)
  }

  async function resetForm() {
    window.location.href=pathname;
  }

  async function invokeOp(id: any, requiredKeys: string[] = []) {
    const inputs: Record<string, any> = {};

    //First attempt , do all validations and inform user of operation inputs
    if(buttonText == "Run" ) {
      //Check if any inputs are provided by user
      try {
        if(input ) {    
          //Check if all required values are provided
          for (let index = 0; index < requiredKeys.length; index++) {
            if (!input.has(requiredKeys[index])) {
              throw new Error("The input \""+requiredKeys[index]+"\" is expected as per the operation schema. please verify before running the operation");
            }
          }
          
          //Values are already processed by the input components
          let response: any = "";
        
          if (asset && asset.metadata?.operation) {
              response = await asset.run(input);
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
          let response: any = "";
           try {
            if (asset && asset.metadata?.operation) {
                setLoading(true)
                response = await asset.run(input);
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
    type: string, 
    defaultValue: string, 
    placeholder: string, 
    description: string, 
    onValueChange: (value: any) => void,
    onTypeChange: (type: any) => void
  ) {
    // Helper function to process a value based on its type
    const processValue = (value: any) => {
      if (type === "json" || type === "object" || type === "any") {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch(e) {
            // If parsing fails, return the raw string value
            return value;
          }
        }
        return value;
      } else if (type === "number") {
        return Number(value);
      } else {
        return value;
      }
    };

    const commonProps = {
      className: "flex-1 placeholder:text-gray-500",
      defaultValue,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const processedValue = processValue(e.target.value);
        onValueChange(processedValue);
      }
    };

    const typeSelector = (
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">string</SelectItem>
          <SelectItem value="number">number</SelectItem>
          <SelectItem value="json">json</SelectItem>
          <SelectItem value="object">object</SelectItem>
          <SelectItem value="any">any</SelectItem>
          <SelectItem value="asset">asset</SelectItem>
        </SelectContent>
      </Select>
    );

    if (type === "string") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Input {...commonProps} type="text" />
          {typeSelector}
        </div>
      );
    }

    if (type === "asset") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Input {...commonProps} type="text" />
          {typeSelector}
        </div>
      );
    }

    if (type === "number") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Input {...commonProps} type="text" />
          {typeSelector}
        </div>
      );
    }

    if (type === "json" || type === "object" || type === "any") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Textarea {...commonProps} rows={5} />
          {typeSelector}
        </div>
      );
    }

    return null;
  }

  function renderDescription(description: string) {
    return (
      <div className="text-sm text-gray-600">{description}</div>
    );
  }

  function renderInputFields(inputSchema: any) {
    if (inputSchema != null && inputSchema != undefined && inputSchema.properties) {
      const properties = inputSchema.properties;
      const requiredKeys = inputSchema.required || [];
      const keys = Object.keys(properties);
      const type = new Array<string>();
      const description = new Array<string>();
      const defaultValue = new Array<string>();
      const exampleValue = new Array<string>();

      keys.map((key, index) => {
        const jsonValue = properties[key];
        type[index] = jsonValue.type;
        description[index] = jsonValue.description;
        defaultValue[index] = jsonValue.default || "";
        exampleValue[index] = jsonValue.examples ? `e.g. ${Array.isArray(jsonValue.examples) ? jsonValue.examples[0] : jsonValue.examples}` : "";
      });
      return (
        <div className="w-11/12 my-2">
          <div className="grid grid-cols-[min-content_1fr_1fr] gap-4 items-center">
            {keys.map((key, index) => (
              <>
                <div className="flex flex-row items-center min-w-0">
                  <Label className="whitespace-nowrap">{key}</Label>
                  {requiredKeys?.indexOf(key) != -1 && <span className="text-red-400 ml-1">*</span>}
                </div>
                {renderInputComponent(
                  typeMap.get(key) || type[index],
                  defaultValue[index],
                  exampleValue[index],
                  description[index],
                  (value) => setKeyValue(key, value),
                  (type) => setKeyType(key, type)
                )}
                {renderDescription(description[index])}
              </>
            ))}
          </div>
          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
          <div className="flex flex-row space-x-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(asset?.id, requiredKeys)}>{buttonText}</Button>}
          {!loading && <Button type="button" className="w-32" onClick={() => resetForm()}>Reset</Button>}
          </div>

          {loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}
        </div>
      )
    }
    else {
      // render a single input field for the whole input object
      return (
        <div className="w-11/12 my-2">
          <div className="grid grid-cols-[min-content_1fr_1fr] gap-4 items-center">
            <div className="flex flex-row items-center min-w-0">
              <Label className="whitespace-nowrap">Input</Label>
            </div>
            {renderInputComponent(
              typeMap.get("none") || "any",
              "",
              "e.g. Provide input here",
              "Provide input for the operation",
              (value) => setInput(value),
              (type) => setKeyType("none", type)
            )}
            {renderDescription("Provide input for the operation")}
          </div>

          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
           <div className="flex flex-row space-x-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(asset?.id, [])}>{buttonText}</Button>}
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
            {renderInputFields(asset?.metadata?.operation?.input)}
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

