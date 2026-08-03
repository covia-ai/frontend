"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useResolvedVenue } from "@/hooks/use-resolved-venue";
import { useAssetDetails } from "@/hooks/use-asset-details";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { ErrorDisplay } from "./ErrorDisplay";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";

interface AssetViewerProps {
  assetId: string;
  venueId: string;
}

export function AssetViewer(props: AssetViewerProps) {
  const venue = useResolvedVenue(props.venueId);
  const { asset, loading, error } = useAssetDetails(venue, props.assetId);

  return (
    <ContentLayout>
      <TopBar assetOrJobName={asset?.metadata?.name} venueName={venue?.metadata?.name ?? ""} />
      {loading && (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}
      {error && <ErrorDisplay error={error} className="m-4" />}
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
