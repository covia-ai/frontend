"use client";

import { useResolvedVenue } from "@/hooks/use-resolved-venue";
import { useAssetDetails } from "@/hooks/use-asset-details";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { AssetLoadState } from "./AssetLoadState";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";

interface AssetViewerProps {
  assetId: string;
  venueId: string;
}

export function AssetViewer(props: AssetViewerProps) {
  const venue = useResolvedVenue(props.venueId);
  const { asset, loading, error, notFound } = useAssetDetails(venue, props.assetId);

  return (
    <ContentLayout>
      <TopBar assetOrJobName={asset?.metadata?.name} venueName={venue?.metadata?.name ?? ""} />
      <AssetLoadState
        loading={loading}
        error={error}
        notFound={notFound}
        notFoundMessage={`The asset ID "${props.assetId}" does not exist on this venue.`}
      />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} venue={venue} />
        </div>
      )}
    </ContentLayout>
  );
}
