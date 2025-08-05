
'use client'
/* eslint-disable */

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
import { Copy, CopyCheck } from "lucide-react";
import copy from 'copy-to-clipboard';
import { toast } from "sonner"

export const OperationViewer = (props: any) => {
  const [assetsMetadata, setAssetsMetadata] = useState<Operation>();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const valueMap = new Map();
  const router = useRouter();
  const venue = useStore(useVenue, (x) => x).venue;
  if (!venue) return null;


  useEffect(() => {
    venue.getAsset(props.assetId).then((asset: Operation) => {
      setAssetsMetadata(asset);

    })

  }, []);



  function setKeyValue(key, value) {
    valueMap.set(key, value);
  }
  async function invokeOp(id, requiredKeys: string[] = []) {
    setLoading(true)
    let operationStatus = true;
    for (let index = 0; index < requiredKeys.length; index++) {
      if (!valueMap.has(requiredKeys[index]))
        operationStatus = false;
    }
    console.log(operationStatus)
    if (operationStatus) {
      let inputs = {};
      for (const [key, value] of valueMap) {
        inputs[key] = value;
      }
      let response = {};
      try {
        let payload = {
          "operation": id,
          "input": inputs
        }
        console.log(assetsMetadata)
        response = await assetsMetadata?.invoke(payload);

      }
      catch (e: Error) {
        console.log(e)
        setErrorMessage(e.message);
        setLoading(false);
      }
      if (response?.id) {
        router.push("/runs/" + response?.id);
      }
    } else {
      setErrorMessage("Please provide all the inputs")
      setLoading(false);
    }
  }
  function renderJSONMap(jsonObject: JSON, requiredKeys: string[]) {
    if (jsonObject != null && jsonObject != undefined) {
      let keys = Object.keys(jsonObject);
      let type = new Array<string>();
      let description = new Array<string>();
      let defaultValue = new Array<string>();

      keys.map((key, index) => {
        let jsonValue = jsonObject[key];
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
                    onChange={e => setKeyValue(key, e.target.value)}
                    type="text"></Input>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              )
              }
              {type[index] == "asset" &&
                <>
                  <Input className="my-2 flex-1" type="text"
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, e.target.value)}></Input>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
              {type[index] == "json" &&
                <>
                  <Textarea className="my-2 flex-1" rows={5} cols={200}
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, e.target.value)}></Textarea>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
              {type[index] == "object" &&
                <>
                  <Textarea className="my-2 flex-1" rows={5} cols={200}
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, e.target.value)}></Textarea>
                  <span className="text-sm text-gray-600 ml-2">{description[index]}</span>
                </>
              }
              {type[index] == "number" &&
                <>
                  <Input className="my-2 flex-1" type="text"
                    defaultValue={defaultValue[index]}
                    onChange={e => setKeyValue(key, e.target.value)}></Input>
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
        {assetsMetadata && <AssetHeader assetsMetadata={assetsMetadata} />}
        {assetsMetadata && <MetadataViewer asset={assetsMetadata} />}
        {renderJSONMap(assetsMetadata?.metadata?.operation?.input?.properties, assetsMetadata?.metadata?.operation?.input?.required)}
        {assetsMetadata?.metadata?.operation?.steps && <DiagramViewer metadata={assetsMetadata.metadata}></DiagramViewer>}
      </div>
    </>
  );
};

