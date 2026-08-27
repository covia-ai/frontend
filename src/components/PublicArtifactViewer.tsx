"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAssetIdFromVenueId } from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { notifyWarning } from "@/lib/notify";
import { AssetViewer } from "./AssetViewer";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { FileKey } from "lucide-react";

interface PublicArtifactViewerProps {
  assetHex: string;
}

// Venue-less asset detail route: the URL carries only the content hash, and
// the venue comes from whichever one is globally selected (same fallback
// AssetList/OperationsList use when rendered without a routeVenueId) rather
// than a /venues/[slug] path segment. Falls back to the venue-scoped route
// when nothing is selected, since a hash alone can't be resolved without one.
export function PublicArtifactViewer({ assetHex }: PublicArtifactViewerProps) {
  const { descriptor, venue } = useResolvedVenueContext();
  const router = useRouter();

  // This page has no "correct" venue to fall back to — it always follows
  // whichever venue is globally selected. If that venue (whether from the
  // initial load or a mid-view switch via the venue selector) doesn't have
  // this asset, there's nothing useful left to show here.
  const handleNotFound = useCallback(() => {
    notifyWarning("Asset not found on this venue", {
      description: `"${decodeURIComponent(assetHex)}" isn't on ${venue?.metadata?.name ?? "the selected venue"}. Showing Public Artifacts instead.`,
    });
    router.replace("/publicartifacts");
  }, [assetHex, venue, router]);

  if (!descriptor || !venue) {
    return (
      <ContentLayout>
        <TopBar />
        <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
          <FileKey size={64} className="text-primary" />
          <div className="text-primary text-lg">No Venue Selected</div>
          <div className="text-card-foreground text-sm">Select a venue to view this asset</div>
        </div>
      </ContentLayout>
    );
  }

  const assetId = getAssetIdFromVenueId(decodeURIComponent(assetHex), descriptor.venueId);

  return <AssetViewer assetId={assetId} venueId={descriptor.venueId} onNotFound={handleNotFound} />;
}
