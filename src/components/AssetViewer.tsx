"use client";

import { useEffect } from "react";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { useAssetDetails } from "@/hooks/use-asset-details";
import { MetadataViewer } from "./MetadataViewer";
import { AssetHeader } from "./AssetHeader";
import { AssetLoadState } from "./AssetLoadState";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";

interface AssetViewerProps {
  assetId: string;
  venueId: string;
  // Fires once when the asset turns out not to exist on the resolved venue —
  // e.g. PublicArtifactViewer redirects back to /publicartifacts, since a
  // venue-less asset page follows whichever venue is globally selected and
  // has no "correct" venue to fall back to.
  onNotFound?: () => void;
}

export function AssetViewer(props: AssetViewerProps) {
  const { venue, isAuthenticated } = useResolvedVenueContext(props.venueId);
  const { asset, loading, error, notFound } = useAssetDetails(venue, props.assetId);

  useEffect(() => {
    if (notFound) props.onNotFound?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notFound]);

  return (
    <ContentLayout>
      <TopBar venueId={props.venueId} assetOrJobName={asset?.metadata?.name} venueName={venue?.metadata?.name ?? ""} />
      <AssetLoadState
        loading={loading}
        error={error}
        notFound={notFound}
        notFoundMessage={`The asset ID "${props.assetId}" does not exist on this venue.`}
      />
      {asset && (
        <div className="flex flex-col w-full items-center justify-center">
          <AssetHeader asset={asset} />
          <MetadataViewer asset={asset} venue={venue} isAuthenticated={isAuthenticated} />
        </div>
      )}
    </ContentLayout>
  );
}
