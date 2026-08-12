"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { notifyWarning } from "@/lib/notify";
import { OperationViewer } from "./OperationViewer";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { PlayCircle } from "lucide-react";

interface PublicOperationViewerProps {
  path: string[];
}

// Venue-less operation detail route, mirroring PublicArtifactViewer, but
// operations are catalog-path addressed ("v/ops/a2a/agent-card"), not
// content-hashed like assets — so this is a catch-all carrying the full
// namespace-explicit address (same shape the venue-scoped catch-all route
// at /venues/[slug]/operations/[...id] already resolves), not a bare hash.
// The venue comes from whichever one is globally selected rather than a
// /venues/[slug] path segment.
export function PublicOperationViewer({ path }: PublicOperationViewerProps) {
  const { descriptor, venue } = useResolvedVenueContext();
  const router = useRouter();
  const address = path.map((s) => decodeURIComponent(s)).join("/");

  // Same reasoning as PublicArtifactViewer.handleNotFound: this page always
  // follows the globally selected venue, so a not-found here (initial load
  // or a mid-view switch) has no "correct" venue to fall back to.
  const handleNotFound = useCallback(() => {
    notifyWarning("Operation not found on this venue", {
      description: `"${address}" isn't on ${venue?.metadata?.name ?? "the selected venue"}. Showing Operations instead.`,
    });
    router.replace("/operations");
  }, [address, venue, router]);

  if (!descriptor || !venue) {
    return (
      <ContentLayout>
        <TopBar />
        <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
          <PlayCircle size={64} className="text-primary" />
          <div className="text-primary text-lg">No Venue Selected</div>
          <div className="text-card-foreground text-sm">Select a venue to view this operation</div>
        </div>
      </ContentLayout>
    );
  }

  return <OperationViewer assetId={address} venueId={descriptor.venueId} onNotFound={handleNotFound} />;
}
