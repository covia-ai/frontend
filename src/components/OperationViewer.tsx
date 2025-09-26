
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
  const [input, setInput] = useState<any>({}); // actual input values to be passed to the operation, can be any JSON value
  const [rawInput, setRawInput] = useState<Record<string, string>>({}); // raw input content before parsing per field name
  const [typeMap, setTypeMap] = useState<Record<string, string>>({}); // user-specified types of the values to be passed to the operation, affects parsing
  const [assetNotFound, setAssetNotFound] = useState(false);

  // Session storage key based on asset ID
  const getStorageKey = (suffix: string) => `operation_input_${props.assetId}_${suffix}`;

  // Fake key to indicate top level input
  const TOP_LEVEL_INPUT_KEY = "__top__";

  // Save input values to session storage
  const saveToSessionStorage = (inputData: any, rawInputData: Record<string, string>, typeData: Record<string, string>) => {
    try {
      sessionStorage.setItem(getStorageKey('input'), JSON.stringify(inputData));
      sessionStorage.setItem(getStorageKey('rawInput'), JSON.stringify(rawInputData));
      sessionStorage.setItem(getStorageKey('types'), JSON.stringify(typeData));
    } catch (error) {
      console.warn('Failed to save to session storage:', error);
    }
  };

  // Restore input values from session storage
  const restoreFromSessionStorage = () => {
    try {
      const savedInput = sessionStorage.getItem(getStorageKey('input'));
      const savedRawInput = sessionStorage.getItem(getStorageKey('rawInput'));
      const savedTypes = sessionStorage.getItem(getStorageKey('types'));

      if (savedInput) {
        const parsedInput = JSON.parse(savedInput);
        setInput(parsedInput);
      }

      if (savedRawInput) {
        const parsedRawInput = JSON.parse(savedRawInput);
        setRawInput(parsedRawInput);
      }

      if (savedTypes) {
        const parsedTypes = JSON.parse(savedTypes);
        setTypeMap(parsedTypes);
      }
    } catch (error) {
      console.warn('Failed to restore from session storage:', error);
    }
  };

  // Clear session storage
  const clearSessionStorage = () => {
    try {
      sessionStorage.removeItem(getStorageKey('input'));
      sessionStorage.removeItem(getStorageKey('rawInput'));
      sessionStorage.removeItem(getStorageKey('types'));
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  };

  const router = useRouter();
  const pathname = usePathname();
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());

  if (!venueObj) return null;
  const venue = useMemo(() => {
    // Your expensive calculation or value creation
    return new Venue({ baseUrl: venueObj.baseUrl, venueId: venueObj.venueId })
  }, []); // Dependency array

  useEffect(() => {
    setAssetNotFound(false);
    setErrorMessage("");
    venue.getAsset(props.assetId)
      .then((asset: Asset) => {
        setAsset(asset);

        // Try to restore from session storage first
        restoreFromSessionStorage();

        // If no saved data and input schema specifies an object with properties
        // then pre-populate defaults into input and types into typeMap
        if (asset?.metadata?.operation?.input?.properties) {
          const properties = asset.metadata.operation.input.properties;
          const newInput: Record<string, any> = {};
          const newTypeMap: Record<string, string> = {};

          Object.keys(properties).forEach(key => {
            const property = properties[key];
            if (property.default !== undefined) {
              newInput[key] = property.default;
            }
            if (property.type !== undefined) {
              newTypeMap[key] = property.type;
            }
          });

          // Only set defaults if no saved data exists
          const hasSavedInput = sessionStorage.getItem(getStorageKey('input'));
          const hasSavedTypes = sessionStorage.getItem(getStorageKey('types'));

          if (!hasSavedInput) {
            setInput(newInput);
          }
          if (!hasSavedTypes) {
            setTypeMap(newTypeMap);
          }
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

  // Save to session storage whenever input changes
  useEffect(() => {
    if (input !== null && input !== undefined && (typeof input === 'object' ? Object.keys(input).length > 0 : true)) {
      saveToSessionStorage(input, rawInput, typeMap);
    }
  }, [input, rawInput, typeMap]);

  // Helper function to process a value based on its type
  const parseValue = (rawValue: string, type: string) => {
    if (type === "json" || type === "object" || type === "any" || type === "array") {
      return JSON.parse(rawValue);
    } else if (type === "number") {
      return Number(rawValue);
    } else {
      return rawValue;
    }
  };

  // Helper function to convert a value to appropriate raw input string based on type
  const printValue = (value: any, type: string) => {
    console.log(value+" : "+type)
    if (type === "json" || type === "object" || type === "any" || type === "array") {
      // Convert to JSON string
      if (value !== undefined && value !== null && value != "") {
        return JSON.stringify(value, null, 2);
      } else {
        return type === "array" ? "[]" : "{}";
      }
    } else if (type === "number") {
      // Convert to number string
      return String(value || 0);
    } else {
      // For string and other types, convert to string
      return String(value || '');
    }
  };

  function setKeyValue(key: any, value: any) {
    if (key === TOP_LEVEL_INPUT_KEY) {
      setInput(value);
    } else {
      setInput((prev: any) => {
        if (typeof prev === 'object' && prev !== null) {
          return { ...prev, [key]: value };
        } else {
          return { [key]: value };
        }
      });
    }
  }

  function setKeyRawValue(key: any, value: string) {
    setRawInput(prev => ({ ...prev, [key]: value }));
  }

  function setKeyType(key: any, type: any) {
    setTypeMap(prev => ({ ...prev, [key]: type }));
  }

  function setKeyTypeAndUpdateRawInput(key: any, newType: any) {
    // Update the type
    setTypeMap(prev => ({ ...prev, [key]: newType }));

    // Update raw input based on the new type
    const currentValue = key === TOP_LEVEL_INPUT_KEY ? input : input[key];
    const newRawValue = printValue(currentValue, newType);

    setRawInput(prev => ({ ...prev, [key]: newRawValue }));
  }

  async function resetForm() {
    clearSessionStorage();
    setInput({});
    setRawInput({});
    setTypeMap({});
    window.location.href = pathname;
  }

  function runOperation() {
    return asset?.run(input)
      .then(response => {
        if (response?.id) {
          router.push("/venues/"+venue.venueId+"/jobs/" + response?.id);
        }
        return response;
      });
  }

  function invokeOp(id: any, requiredKeys: string[] = []) {
    //First attempt , do all validations and inform user of operation inputs
    if (buttonText == "Run") {
      //Check if any inputs are provided by user
      try {
        // Check if input exists and is not empty
        const isObject = input !== null && input !== undefined &&
          (typeof input === 'object' ? Object.keys(input).length > 0 : input !== '');

        if (isObject) {
          //Check if all required values are provided (only for object inputs)
          if (typeof input === 'object' && input !== null) {
            for (let index = 0; index < requiredKeys.length; index++) {
              if (!(requiredKeys[index] in input)) {
                throw new Error("The input \"" + requiredKeys[index] + "\" is expected as per the operation schema. please verify before running the operation");
              }
            }
          }

          //Values are already processed by the input components
          runOperation();

        } else {
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
    } else {
      //Second attempt for "Run Anyway?" button, we do not do any validation just run the operations
      setLoading(true)
      const operationPromise = runOperation();
      if (operationPromise) {
        operationPromise.catch(e => {
          setErrorMessage(e.message)
          setLoading(false);
        });
      } else {
        setErrorMessage("This asset is not an operation and cannot be invoked");
        setLoading(false);
      }
    }
  }

  function renderInputComponent(
    key: string,
    schema: any,
    onValueChange: (value: any) => void,
    onRawValueChange: (value: string) => void,
    onTypeChange: (type: any) => void
  ) {
    const defaultValue = schema.default || "";
    const exampleValue = schema.examples ? `e.g. ${Array.isArray(schema.examples) ? schema.examples[0] : schema.examples}` : "";
    const type = typeMap[key] || schema.type || "string";
    const isSecret = schema.secret === true;

    // Get current raw value from rawInput state or use default
  
    const currentRawValue = key == TOP_LEVEL_INPUT_KEY ?
      (rawInput[key] !== undefined ? rawInput[key] : printValue(input, type)) :
      (rawInput[key] !== undefined ? rawInput[key] : printValue(defaultValue, type));
    const commonProps = {
      className: "flex-1 placeholder:text-gray-500",
      value: currentRawValue,
      placeholder: exampleValue,
      type: isSecret ? "password" : undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const rawValue = e.target.value;
        // Always update raw input
        onRawValueChange(rawValue);

        try {
          const processedValue = parseValue(rawValue, type);
          onValueChange(processedValue);
        } catch (err) {
          // If parsing fails, still update raw input but don't update parsed input
          // This allows users to see their raw input even if it's invalid JSON
        }
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
          <SelectItem value="array">array</SelectItem>
        </SelectContent>
      </Select>
    );

    if (type === "string") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Input {...commonProps} type={isSecret ? "password" : "text"} />
          {typeSelector}
        </div>
      );
    }

    if (type === "asset") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Input {...commonProps} type={isSecret ? "password" : "text"} />
          {typeSelector}
        </div>
      );
    }

    if (type === "number") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Input {...commonProps} type={isSecret ? "password" : "number"} />
          {typeSelector}
        </div>
      );
    }

    if (type === "json" || type === "object" || type === "any" || type === "array") {
      return (
        <div className="flex flex-row space-x-2 items-center">
          <Textarea
            {...commonProps}
            rows={5}
            className={`flex-1 placeholder:text-gray-500 ${isSecret ? 'font-mono' : ''}`}
            style={isSecret ? { fontFamily: 'monospace', letterSpacing: '0.1em' } : undefined}
          />
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
    if (inputSchema && inputSchema.properties) {
      // In this case the schema specifies a JSON object with properties so we render a form for each property
      const properties = inputSchema.properties;
      const requiredKeys = inputSchema.required || [];
      const keys = Object.keys(properties);
      return (
        <div className="w-11/12 my-2">
          <div className="grid grid-cols-[min-content_1fr_1fr] gap-4 items-center py-2">
            {keys.map((key, index) => (
              <>
                <div className="flex flex-row items-center min-w-0">
                  <Label className="whitespace-nowrap">{key}</Label>
                  {requiredKeys?.indexOf(key) != -1 && <span className="text-red-400 ml-1">*</span>}
                </div>
                {renderInputComponent(
                  key,
                  properties[key],
                  (value) => setKeyValue(key, value),
                  (value) => setKeyRawValue(key, value),
                  (type) => setKeyTypeAndUpdateRawInput(key, type)
                )}
                {renderDescription(properties[key].description || "")}
              </>
            ))}
          </div>
          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
          <div className="flex flex-row space-x-2 items-center justify-center py-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(asset?.id, requiredKeys)}>{buttonText}</Button>}
            {!loading && <Button type="button" className="w-32" onClick={() => resetForm()}>Reset</Button>}
          </div>

          <div className="flex flex-row space-x-2 items-center justify-center py-2">{loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}</div>
        </div>
      )
    }
    else {
      // fallback: render a single input field for the whole input object
      return (
        <div className="w-11/12 my-2">
          <div className="grid grid-cols-[min-content_1fr_1fr] gap-4 items-center">
            <div className="flex flex-row items-center min-w-0">
              <Label className="whitespace-nowrap">(Input)</Label>
            </div>
            {renderInputComponent(
              TOP_LEVEL_INPUT_KEY,
              { type: "any", description: "Provide input for the operation", default: "" },
              (value) => setInput(value),
              (value) => setKeyRawValue(TOP_LEVEL_INPUT_KEY, value),
              (type) => setKeyTypeAndUpdateRawInput(TOP_LEVEL_INPUT_KEY, type)
            )}
            {renderDescription("Provide input for the operation")}
          </div>

          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
          <div className="flex flex-row space-x-2 items-center justify-center py-2">{!loading && <Button type="button" className="w-32" onClick={() => invokeOp(asset?.id, [])}>{buttonText}</Button>}
            {!loading && <Button type="button" className="w-32" onClick={() => resetForm()}>Reset</Button>}
          </div>
          <div className="flex flex-row space-x-2 items-center justify-center py-2">{loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}</div>
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

