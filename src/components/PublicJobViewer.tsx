"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { notifyWarning } from "@/lib/notify";
import { ExecutionViewer } from "./ExecutionViewer";
import { ContentLayout } from "./admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { Activity } from "lucide-react";

interface PublicJobViewerProps {
  jobId: string;
}

// Venue-less job detail route, mirroring PublicArtifactViewer/
// PublicOperationViewer: the URL carries only the job id, and the venue
// comes from whichever one is globally selected rather than a
// /venues/[slug] path segment. Falls back to the venue-scoped route
// when nothing is selected, since a bare job id can't be resolved without one.
export function PublicJobViewer({ jobId }: PublicJobViewerProps) {
  const { descriptor, venue } = useResolvedVenueContext();
  const router = useRouter();

  // Same reasoning as PublicArtifactViewer.handleNotFound: this page always
  // follows the globally selected venue, so a not-found here (initial load
  // or a mid-view switch) has no "correct" venue to fall back to.
  const handleNotFound = useCallback(() => {
    notifyWarning("Job not found on this venue", {
      description: `"${jobId}" isn't on ${venue?.metadata?.name ?? "the selected venue"}. Showing Jobs instead.`,
    });
    router.replace("/jobs");
  }, [jobId, venue, router]);

  if (!descriptor || !venue) {
    return (
      <ContentLayout>
        <TopBar />
        <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
          <Activity size={64} className="text-primary" />
          <div className="text-primary text-lg">No Venue Selected</div>
          <div className="text-card-foreground text-sm">Select a venue to view this job</div>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <ExecutionViewer jobId={jobId} venueId={descriptor.venueId} onNotFound={handleNotFound} />
    </ContentLayout>
  );
}
