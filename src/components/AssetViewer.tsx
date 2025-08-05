'use client'

import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia";
import Link from "next/link";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";

export const AssetViewer = (props: any) => {

  const [asset, setAsset] = useState<Asset>();

  const venue = useStore(useVenue, (x) => x).venue;
  if (!venue) return null;

  useEffect(() => {
    venue.getAsset(props.assetId).then((asset: Asset) => {
      setAsset(asset);

    })
  }, []);

  return (
    <>
      <SmartBreadcrumb />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} />
          <div className="flex flex-row items-center space-x-2 my-2 text-xs text-slate-800">
            <span>Venue:</span>
            <span><Link href="/venues/default" className="underline text-secondary"> {asset?.venue?.venueId}</Link></span>
          </div>
        </div>
      )}
    </>
  );
};

