
'use client'
/* eslint-disable */

import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia/covialib";
import { Copy } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { copyDataToClipBoard } from "@/lib/utils";
import { Table, TableCell, TableHead, TableRow } from "./ui/table";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";

export const AssetViewer = (props: any) => {

  const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
  const [content, setContent] = useState("");

  const venue = useStore(useVenue, (x) => x).venue;
  if (!venue) return null;

  useEffect(() => {
    venue.getAsset(props.assetId).then((asset: Asset) => {
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
    let contentDownloadUrl = venue.baseUrl + "/api/v1/assets/" + assetsMetadata?.id + "/content";
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
          <AssetHeader assetsMetadata={assetsMetadata} />
          <MetadataViewer assetsMetadata={assetsMetadata} content={content} />
          <div className="flex flex-row items-center space-x-2 my-2 text-xs text-slate-800">
            <span>Venue:</span>
            <span><Link href="/venues/default" className="underline text-secondary"> {assetsMetadata?.venue?.venueId}</Link></span>
          </div>
        </div>
      )}
    </>

  );
};

