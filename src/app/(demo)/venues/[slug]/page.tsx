"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Boxes, Building2, ExternalLink, Fingerprint, Globe, Link as LinkIcon, Package, Puzzle, ScrollText, Settings, Star, Users, Zap }from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import { use, useEffect, useState, type ComponentType } from "react";
import { CopyField } from "@/components/CopyField";
import { StatTile } from "@/components/StatTile";
import { TopBar } from "@/components/admin-panel/TopBar";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { useMcpDiscovery } from "@/hooks/use-mcp-discovery";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { getVenueStatus } from "@/lib/venue-registry";
import { McpConnectSection } from "@/components/venue/McpConnectSection";
import { VenueMark } from "@/components/VenueMark";
import { VenueTrustPill } from "@/components/VenueTrustPill";
import { venueDisplayName } from "@/lib/venue-display";

interface VenuePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function VenuePage({ params }: VenuePageProps) {
  const router = useRouter();
  const { slug } = use(params);
  const routeVenueId = decodeURIComponent(slug);
  const { venue, status, error } = useResolvedVenueContext(routeVenueId);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const selectVenue = useVenues((state) => state.selectVenue);
  const [ venueDID, setVenueDID] = useState("");
  const [ venueName, setVenueName] = useState("");
  // Shared /.well-known/mcp discovery — one request even though McpConnectSection
  // below also consumes it (W4 4A; was fetched twice per load).
  const venueMCPUrl = useMcpDiscovery(venue);
  const [ noOfAssets, setNoOfAssets] = useState(0)
  const [ noOfOps, setNoOfOps] = useState(0)
  const [ noOfAdapters, setNoOfAdapters] = useState(0)
  const [ noOfRuns, setNoOfRuns] = useState(0)
  const [ noOfUsers, setNoOfUsers] = useState(0)
  useEffect(() => {
       if (!venue || status !== "ready") return;
       const fetchStats = async () => {
         try {
          const status = await getVenueStatus(venue);
          if(status?.stats) {
              setNoOfAssets(status?.stats?.assets ?? 0);
              setNoOfOps(status?.stats?.ops ?? 0);
              setNoOfUsers(status?.stats?.users ?? 0);
              setVenueDID(status?.did ?? "")
              setVenueName(status?.name ?? "")
              // Venues up to at least 0.5.0 omit stats.jobs from /api/v1/status
              // (covia-ai/covia#229) — fall back to counting the job index via
              // the job-free GET /api/v1/jobs rather than showing a false 0.
              if (status?.stats?.jobs != undefined) {
                  setNoOfRuns(status.stats.jobs);
              } else if (venue) {
                  try { setNoOfRuns((await venue.jobs.list()).length); } catch { /* leave at 0 */ }
              }
          }
        }
        catch(e) {
          console.log(e)
        }
      }
      const fetchAdapters = async () => {
        try {
          if (venue) setNoOfAdapters((await venue.adapters.list()).length);
        } catch { /* non-fatal */ }
      }
      fetchStats();
      fetchAdapters();
  }, [venue, status]);

  const isCurrentVenue = selectedVenueId === venue?.venueId;
  const venueHost = (() => {
    try {
      return venue ? new URL(venue.baseUrl).host : "";
    } catch {
      return venue?.baseUrl ?? "";
    }
  })();
  if (status !== "ready" || !venue) {
    return (
      <ContentLayout>
        <TopBar venueId={routeVenueId} assetOrJobName={routeVenueId}/>
        {status === "connecting" || status === "unreachable" || status === "auth-required" ? (
          <VenueResolutionState status={status} error={error} icon={Building2} subject="this venue" venueId={routeVenueId} />
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Venue not found</p>
          </div>
        )}
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar venueId={routeVenueId} venueName={venue.metadata.name}/>
      
      <div className="flex flex-col space-y-6">
        {/* Venue Header */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <VenueMark venueId={venue.venueId} className="size-14" />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold">{venueName || venueDisplayName(venue)}</h1>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{venueHost}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Real access state — replaces the old hard-coded "Active" badge. */}
                  <VenueTrustPill baseUrl={venue.baseUrl} venueId={venue.venueId} />
                  {isCurrentVenue && (
                    <Badge variant="secondary" className="gap-1">
                      <Star size={11} className="fill-primary text-primary" /> Your default
                    </Badge>
                  )}
                  <Badge variant="outline">covia</Badge>
                </div>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  {venue.metadata.description || "A Covia venue for managing assets and operations"}
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col space-y-2 sm:w-auto">
              <Button
                onClick={() => window.open(venue.baseUrl, '_blank')}
                variant="outline"
                aria-label="open venue" role="button"
                className="flex items-center justify-center space-x-2"
              >
                <ExternalLink size={16} />
                <span>Open Venue</span>
              </Button>

              <Button
                onClick={() => router.push(`/venues/${slug}/connect`)}
                variant="outline"
                aria-label="integrate" role="button"
                className="flex items-center justify-center space-x-2"
              >
                <Zap size={16} />
                <span>Integrate</span>
              </Button>

              <Button
                onClick={() => selectVenue(venue.venueId)}
                variant={isCurrentVenue ? "default" : "secondary"}
                aria-label="make default" role="button"
                className="flex items-center justify-center space-x-2 bg-secondary text-secondary-foreground border border-muted"
                disabled={isCurrentVenue}
              >
                <Settings size={16} />
                <span>{isCurrentVenue ? "Current Default" : "Make Default"}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Venue Information */}
        <Card className="p-6">
          <h2 className="text-xl font-thin mb-4">Venue Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-primary-vlight p-2 rounded-lg">
                <LinkIcon size={20} className="text-primary" />
              </div>
              <CopyField label="Venue URL" value={venue.baseUrl} href={venue.baseUrl} className="flex-1" />
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-primary-vlight p-2 rounded-lg">
                <Fingerprint size={20} className="text-primary" />
              </div>
              <CopyField label="Venue DID" value={venueDID} className="flex-1" />
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-primary-vlight p-2 rounded-lg">
                <Globe size={20} className="text-primary" />
              </div>
              <CopyField label="MCP URL" value={venueMCPUrl} className="flex-1" />
            </div>
          </div>
        </Card>

        {/* Stats grid — the shared StatTile (icon + count), each tile a link to
            its venue sub-page. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {([
            { label: "Assets", value: noOfAssets, icon: Package as ComponentType<{ size?: number; className?: string }>, route: "assets" },
            { label: "Operations", value: noOfOps, icon: Boxes, route: "operations" },
            { label: "Adapters", value: noOfAdapters, icon: Puzzle, route: "adapters" },
            { label: "Users", value: noOfUsers, icon: Users, route: "users" },
            { label: "Jobs", value: noOfRuns, icon: ScrollText, route: "jobs" },
          ]).map((stat) => (
            <Link
              key={stat.route}
              href={`/venues/${slug}/${stat.route}`}
              aria-label={`View ${stat.label}`}
              className="block rounded-xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <StatTile icon={stat.icon} label={stat.label} value={String(stat.value)} caption="View →" />
            </Link>
          ))}
        </div>

        <McpConnectSection venue={venue} slug={slug} />
      </div>
    </ContentLayout>
  );
}
