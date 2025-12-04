'use client'

import { useEffect, useState } from "react";
import { Asset, Venue } from "@/lib/covia";
import Link from "next/link";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { useVenues } from "@/hooks/use-venues";
import { Grid } from "@/lib/covia";
import { CredentialsHTTP } from "@/lib/covia/Credentials";
import { useSession } from "next-auth/react";

interface AssetViewerProps {
  assetId: string;
  venueId: string;
}

export function AssetViewer(props: AssetViewerProps) {
  const { data: session } = useSession();
  const [asset, setAsset] = useState<Asset>();
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  const { venues, addVenue } = useVenues();
  const [venueName, setVenueName] = useState("")

  useEffect(() => {
    if(props.venueId != venueObj?.venueId) {
        const venue = venues.find(v => v.venueId === props.venueId);
        if (venue) {
            new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.name}).getAsset(props.assetId).then((asset: Asset) => {
          setAsset(asset);
          })
          setVenueName(venue.name)
         }
         else {
          Grid.connect(decodeURIComponent(props.venueId),new CredentialsHTTP(props.venueId,"",session?.user?.email || "")).then((venue) => {
            addVenue(venue)
             venue.getAsset(props.assetId).then((asset: Asset) => {
             setAsset(asset);
            })
            setVenueName(venue.name)
          });
         }
    }
    else {
      new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name}).getAsset(props.assetId).then((asset: Asset) => {
      setAsset(asset);
     })
      setVenueName(venueObj.name)
    }  
  }, [addVenue, props.assetId, props.venueId, session?.user?.email, venueObj, venues]);

  return (
    <> 
      <SmartBreadcrumb assetOrJobName={asset?.metadata?.name} venueName={venueName} />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} />
          <div className="flex flex-row items-center space-x-2 my-2 text-xs text-slate-800">
            <span>Venue:</span>
            <span><Link href={`/venues/${venueObj?.venueId}`} className="underline text-secondary"> {venueObj?.venueId}</Link></span>
          </div>
        </div>
      )}
    </>
  );
}

