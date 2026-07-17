'use client'

import { useEffect, useState } from "react";
import { Asset } from "@covia/covia-sdk";
import Link from "next/link";
import { useResolvedVenue } from "@/hooks/use-resolved-venue";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";

interface AssetViewerProps {
  assetId: string;
  venueId: string;
}

export function AssetViewer(props: AssetViewerProps) {
  const [asset, setAsset] = useState<Asset>();
  const venue = useResolvedVenue(props.venueId);

  useEffect(() => {
    if (!venue) return;
    venue.getAsset(props.assetId).then(setAsset).catch(() => {});
  }, [venue, props.assetId]);

  return (
    <ContentLayout>
      <TopBar assetOrJobName={asset?.metadata?.name} venueName={venue?.metadata?.name ?? ""} />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} venue={venue} />
          <div className="flex flex-row items-center space-x-2 my-2 text-xs text-muted-foreground">
            <span>Venue:</span>
            <span><Link href={`/venues/${venue?.venueId}`} className="underline text-secondary dark:text-secondary-light"> {venue?.venueId}</Link></span>
          </div>
        </div>
      )}
    </ContentLayout>
  );
}
