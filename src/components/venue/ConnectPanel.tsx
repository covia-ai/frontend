"use client";

import { Plug } from "lucide-react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { McpConnectSection } from "@/components/venue/McpConnectSection";
import { A2ACard } from "@/components/venue/A2ACard";
import { RestApiSection } from "@/components/venue/RestApiSection";
import { SdkInstallSnippets } from "@/components/venue/SdkInstallSnippets";

interface ConnectPanelProps {
  venueId: string;
}

// Aggregates every integration handle for a venue on one page (#258): MCP +
// Claude Desktop, A2A agent card, REST/OpenAPI docs, and SDK install — so a
// developer can integrate via any protocol without leaving the page.
export function ConnectPanel({ venueId }: ConnectPanelProps) {
  const { venue, status, error } = useResolvedVenueContext(venueId);

  if (status !== "ready" || !venue) {
    return (
      <ContentLayout>
        <TopBar venueId={venueId} assetOrJobName={venueId} />
        <VenueResolutionState
          status={status}
          error={error}
          icon={Plug}
          subject="this venue's integrations"
          venueId={venueId}
        />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar venueId={venueId} venueName={venue.metadata.name} />
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl font-thin">Connect</h1>
          <p className="text-muted-foreground">
            Every way to integrate with {venue.metadata.name || venueId}, in one place.
          </p>
        </div>
        <McpConnectSection venue={venue} slug={venueId} />
        <A2ACard venue={venue} />
        <RestApiSection baseUrl={venue.baseUrl} />
        <SdkInstallSnippets baseUrl={venue.baseUrl} />
      </div>
    </ContentLayout>
  );
}
