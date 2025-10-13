'use client'

import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia";
import Link from "next/link";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";

interface AssetViewerProps {
  assetId: string;
}

export function AssetViewer(props: AssetViewerProps) {
  const [asset, setAsset] = useState<Asset>();
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  
  if (!venueObj) return null;

  useEffect(() => {
    new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name}).getAsset(props.assetId).then((asset: Asset) => {
      setAsset(asset);
    })
  }, [props.assetId]);

  return (
    <>
      <SmartBreadcrumb assetOrJobName={asset?.metadata?.name} venueName={venueObj.name} />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} />
          <div className="flex flex-row items-center space-x-2 my-2 text-xs text-slate-800">
            <span>Venue:</span>
            <span><Link href={`/venues/${venueObj.venueId}`} className="underline text-secondary"> {venueObj.venueId}</Link></span>
          </div>
        </div>
      )}
    </>
  );
}

