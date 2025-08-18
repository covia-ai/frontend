
'use client'

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label"

import { useEffect, useState } from "react";
import { Operation } from "@/lib/covia";
import { useRouter } from "next/navigation";
import { copyDataToClipBoard } from "@/lib/utils";


import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb"




import { Textarea } from "./ui/textarea";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { DiagramViewer } from "./DiagramViewer";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { Asset } from "@/lib/covia";

export const OperationViewer = (props: any) => {
  const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [objectValue, setObjectValue] = useState()
  const valueMap = new Map();
  const router = useRouter();
  const venue = useStore(useVenue, (x) => x).venue;
  if (!venue) return null;


  useEffect(() => {
    venue.getAsset(props.assetId).then((asset: Asset) => {
      setAssetsMetadata(asset);

    })

  }, []);



  function setKeyValue(key, value) {
    valueMap.set(key, value);
  }
  async function invokeOp(id, requiredKeys: string[] = []) {
    setLoading(true)
    if (valueMap.size > 0) {
      let operationStatus = true;
      for (let index = 0; index < requiredKeys.length; index++) {
        if (!valueMap.has(requiredKeys[index]))
          operationStatus = false;
      }
      if (operationStatus) {
        const inputs = {};
        for (const [key, value] of valueMap) {
          if (value[0] == "json" || value[0] == "object")
            inputs[key] = JSON.parse(value[1]);
          else if (value[0] == "number")
            inputs[key] = Number(value[1]);
          else
            inputs[key] = value[1];
        }
        let response = {};
        try {
          // Check if the asset is actually an operation before invoking
          if (assetsMetadata && assetsMetadata.metadata?.operation) {
            response = await assetsMetadata.run(inputs);
          } else {
            throw new Error("This asset is not an operation and cannot be invoked");
          }

        }
        catch (e: Error) {
          setErrorMessage(e.message);
          setLoading(false);
        }
        if (response?.id) {
          router.push("/history/" + response?.id);
        }
      } else {
        setErrorMessage("Please provide all the inputs")
        setLoading(false);
      }
    }
    else {
      let response = "";
      try {

        // Check if the asset is actually an operation before invoking
        if (assetsMetadata && assetsMetadata.metadata?.operation) {
          response = await assetsMetadata.run(JSON.parse(objectValue));
        } else {
          throw new Error("This asset is not an operation and cannot be invoked");
        }

      }
      catch (e) {
        setErrorMessage(e.message);
        setLoading(false);
      }
      if (response?.id) {
        router.push("/history/" + response?.id);
      }
    }
  }
  function renderJSONMap(jsonObject: JSON, requiredKeys: string[]) {
    if (jsonObject != null && jsonObject != undefined) {
      const keys = Object.keys(jsonObject);
      const type = new Array<string>();
      const description = new Array<string>();
      const defaultValue = new Array<string>();

      keys.map((key, index) => {
        const jsonValue = jsonObject[key];
        type[index] = jsonValue.type;
        description[index] = jsonValue.description;
        defaultValue[index] = jsonValue.default || "";
      });

      return (
        <div className="flex flex-col w-7/8 space-x-2 my-2 items-center justify-center">
          {keys.map((key, index) => (
            <div key={index} className="flex flex-row space-x-2 w-full items-center">

              <Label className="w-20">{key} </Label>
              {requiredKeys != undefined && requiredKeys?.indexOf(key) != -1 && <span className="text-red-400">*</span>}
              {type[index] == "string" && (
                <>
                  <Input className="my-2 flex-1"
                    required={true}
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, ["string", e.target.value])}
                    type="text"></Input>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              )
              }
              {type[index] == "asset" &&
                <>
                  <Input className="my-2 flex-1" type="text"
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, ["asset", e.target.value])}></Input>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
              {type[index] == "json" &&
                <>
                  <Textarea className="my-2 flex-1" rows={5} cols={200}
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, ["json", e.target.value])}></Textarea>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
              {type[index] == "object" &&
                <>
                  <Textarea className="my-2 flex-1" rows={5} cols={200}
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, ["json", e.target.value])}></Textarea>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
              {type[index] == "number" &&
                <>
                  <Input className="my-2 flex-1" type="text"
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, ["number", e.target.value])}></Input>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
            </div>
          ))}
          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
          {!loading && <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>Run</Button>}
          {loading && <Button type="button" className="w-32" disabled>Please wait ...</Button>}
        </div>
      )
    }
    else {
      return (
        <div className="flex flex-col items-center justify-center w-full space-x-2 my-2">

          <Textarea className="my-2 flex-1" rows={5} cols={200}
            onChange={e => setObjectValue(e.target.value)}
            placeholder="Provide inputs here"></Textarea>

          <span className="text-xs text-red-400 mb-4">{errorMessage}</span>
          {!loading && <Button type="button" className="w-32" onClick={() => invokeOp(assetsMetadata?.id, requiredKeys)}>Run</Button>}
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

