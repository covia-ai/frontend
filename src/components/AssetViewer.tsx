'use client'

import { useEffect, useState } from "react";
import { Asset, Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import Link from "next/link";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";

interface AssetViewerProps {
  assetId: string;
  venueId: string;
}

export function AssetViewer(props: AssetViewerProps) {
  const authData = useAuthStore((x) => x.auth);
  const [asset, setAsset] = useState<Asset>();
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  const { venues, addVenue } = useVenues();
  const [venueName, setVenueName] = useState("")

  useEffect(() => {
    const authOption = createAuthProvider(authData);
    if(props.venueId != venueObj?.venueId) {
        const venue = venues.find(v => v.venueId === props.venueId);
        if (venue) {
            getVenueFor(venue, authData).getAsset(props.assetId).then((asset: Asset) => {
          setAsset(asset);
          })
          setVenueName(venue.metadata.name)
         }
         else {
          Venue.connect(decodeURIComponent(props.venueId), authOption).then((venue) => {
            addVenue(venue)
             venue.getAsset(props.assetId).then((asset: Asset) => {
             setAsset(asset);
            })
            setVenueName(venue.metadata.name)
          });
         }
    }
    else if (venueObj) {
      getVenueFor(venueObj, authData).getAsset(props.assetId).then((asset: Asset) => {
      setAsset(asset);
     })
      setVenueName(venueObj.metadata.name ?? "")
    }
  }, [addVenue, props.assetId, props.venueId, authData, venueObj, venues]);

  return (
    <ContentLayout> 
      <TopBar assetOrJobName={asset?.metadata?.name} venueName={venueName} />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} />
          <div className="flex flex-row items-center space-x-2 my-2 text-xs text-muted-foreground">
            <span>Venue:</span>
            <span><Link href={`/venues/${venueObj?.venueId}`} className="underline text-secondary dark:text-secondary-light"> {venueObj?.venueId}</Link></span>
          </div>
        </div>
      )}
    </ContentLayout>
  );
}

