"use client";

import { Zap, Contact, Globe, Code2 } from "lucide-react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Card } from "@/components/ui/card";
import { TypeTile } from "@/components/TypeTile";
import { McpGlyph } from "@/components/adapter-glyphs";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { McpConnectSection } from "@/components/venue/McpConnectSection";
import { A2ACard } from "@/components/venue/A2ACard";
import { RestApiSection } from "@/components/venue/RestApiSection";
import { SdkInstallSnippets } from "@/components/venue/SdkInstallSnippets";
import type { IconCmp } from "@/lib/file-type-look";

interface ConnectPanelProps {
  venueId: string;
}

// One glyph + brand-arc tint per protocol, shared by the quick-nav chips and
// each card's header tile, so the four handles read as distinct at a glance.
const PROTOCOLS: { id: string; label: string; sub: string; Icon: IconCmp; tile: string }[] = [
  { id: "mcp", label: "MCP", sub: "Model Context", Icon: McpGlyph, tile: "bg-icon-indigo/15 text-icon-indigo" },
  { id: "a2a", label: "A2A", sub: "Agent card", Icon: Contact, tile: "bg-primary/15 text-primary" },
  { id: "rest", label: "REST", sub: "HTTP + docs", Icon: Globe, tile: "bg-secondary/15 text-secondary" },
  { id: "sdk", label: "SDK", sub: "TypeScript", Icon: Code2, tile: "bg-icon-violet/15 text-icon-violet" },
];

// Aggregates every integration handle for a venue on one page (#258): MCP +
// Claude Desktop, A2A agent card, REST/OpenAPI docs, and SDK install — so a
// developer can integrate via any protocol without leaving the page. Named
// "Integrate" (Wave 4F) to distinguish this venue-outbound page from
// `/connections`, the personal credential vault.
export function ConnectPanel({ venueId }: ConnectPanelProps) {
  const { venue, status, error } = useResolvedVenueContext(venueId);

  if (status !== "ready" || !venue) {
    return (
      <ContentLayout>
        <TopBar venueId={venueId} assetOrJobName={venueId} />
        <VenueResolutionState
          status={status}
          error={error}
          icon={Zap}
          subject="this venue's integrations"
          venueId={venueId}
        />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar venueId={venueId} venueName={venue.metadata.name} />
      <div className="flex flex-col gap-6">
        {/* Header — same icon-tile + title vocabulary as the other venue sub-pages. */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary-vlight p-3 rounded-lg">
              <Zap size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-thin">Integrate</h1>
              <p className="text-sm text-muted-foreground">
                Every way to connect to {venue.metadata.name || venueId}, in one place — MCP, A2A, REST and the SDK.
              </p>
            </div>
          </div>
        </Card>

        {/* Protocol quick-nav — jump to any handle on this long page. */}
        <nav aria-label="Integration protocols" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROTOCOLS.map(({ id, label, sub, Icon, tile }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2.5 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md"
            >
              <TypeTile Icon={Icon} tile={tile} className="size-8 rounded-md" iconSize={16} />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{label}</div>
                <div className="truncate text-xs text-muted-foreground">{sub}</div>
              </div>
            </a>
          ))}
        </nav>

        <div id="mcp" className="scroll-mt-24"><McpConnectSection venue={venue} slug={venueId} /></div>
        <div id="a2a" className="scroll-mt-24"><A2ACard venue={venue} /></div>
        <div id="rest" className="scroll-mt-24"><RestApiSection baseUrl={venue.baseUrl} /></div>
        <div id="sdk" className="scroll-mt-24"><SdkInstallSnippets baseUrl={venue.baseUrl} /></div>
      </div>
    </ContentLayout>
  );
}
