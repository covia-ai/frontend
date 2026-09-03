"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardHeader }from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Database, Settings, Users, Globe, Activity, ArrowRight, ExternalLink, Link as LinkIcon, Fingerprint, Plug }from "lucide-react";
import { useRouter } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import { use, useEffect, useState } from "react";
import { CopyField } from "@/components/CopyField";
import { TopBar } from "@/components/admin-panel/TopBar";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { getVenueStatus } from "@/lib/venue-registry";
import { McpConnectSection } from "@/components/venue/McpConnectSection";

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
  const [ venueMCPUrl, setVenueMCPURL] = useState("Not Found")
  const [ noOfAssets, setNoOfAssets] = useState(0)
  const [ noOfOps, setNoOfOps] = useState(0)
  const [ noOfAdapters, setNoOfAdapters] = useState(0)
  const [ noOfRuns, setNoOfRuns] = useState(0)
  const [ noOfUsers, setNoOfUsers] = useState(0)
  useEffect(() => {
       if (!venue || status !== "ready") return;
       const fetchMCP = async () => {
          try {
            const response = await fetch(`${venue.baseUrl}/.well-known/mcp`);
            if (!response.ok) throw new Error(`MCP discovery failed: ${response.status}`);
            const body = await response.json();
            setVenueMCPURL(body?.error ? "Not Available" : body?.server_url ?? "Not Available");
          } catch {
            setVenueMCPURL("Not Available");
          }
      }
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
      fetchMCP();
      fetchStats();
      fetchAdapters();
  }, [venue, status]);

  const isCurrentVenue = selectedVenueId === venue?.venueId;
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-vlight  p-3 rounded-lg">
                <Building2 size={32} className="text-primary  " />
              </div>
              <div>
                <h1 className="text-2xl font-thin">{venueName}</h1>
                <p className="text-muted-foreground">
                  {venue.metadata.description || "A Covia venue for managing assets and operations"}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                  <Badge variant="outline">covia</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => window.open(venue.baseUrl, '_blank')}
                variant="outline"
                aria-label="open venue" role="button"
                className="flex items-center space-x-2"
              >
                <ExternalLink size={16} />
                <span>Open Venue</span>
              </Button>

              <Button
                onClick={() => router.push(`/venues/${slug}/connect`)}
                variant="outline"
                aria-label="connect" role="button"
                className="flex items-center space-x-2"
              >
                <Plug size={16} />
                <span>Connect</span>
              </Button>

              <Button
                onClick={() => selectVenue(venue.venueId)}
                variant={isCurrentVenue ? "default" : "secondary"}
                aria-label="make default" role="button"
                className="flex items-center space-x-2 bg-secondary text-secondary-foreground border border-muted"
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
          <h2 className="text-xl font-thin mb-4">Venue Information {venue.metadata.name}</h2>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
         <Card className=" h-42 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="flex-1 ">
              <div className="flex items-center space-x-3">
              <div className="bg-primary-vlight  p-2 rounded-lg">
                <Database size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-2xl font-thin">{noOfAssets}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/assets`)}
                  className="w-full"
                  variant="outline"
                  aria-label="view asset" role="button"
                >
                  View Assets
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
        </Card>
          
        <Card className=" h-42 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="flex-1 ">
              <div className="flex items-center space-x-3">
              <div className="bg-primary-vlight  p-2 rounded-lg">
                <Settings size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Operations</p>
                <p className="text-2xl font-thin">{noOfOps}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/operations`)}
                  className="w-full"
                  variant="outline"
                  aria-label="view operation" role="button"
                >
                  View Operation
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
        </Card>

        <Card className=" h-42 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="flex-1 ">
              <div className="flex items-center space-x-3">
              <div className="bg-primary-vlight  p-2 rounded-lg">
                <Plug size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Adapters</p>
                <p className="text-2xl font-thin">{noOfAdapters}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button
                  onClick={() => router.push(`/venues/${slug}/adapters`)}
                  className="w-full"
                  variant="outline"
                  aria-label="view adapters" role="button"
                >
                  View Adapters
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
        </Card>

        <Card className=" h-42 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="flex-1 ">
              <div className="flex items-center space-x-3">
              <div className="bg-primary-vlight  p-2 rounded-lg">
                <Users size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-thin">{noOfUsers}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button
                  onClick={() => router.push(`/venues/${slug}/users`)}
                  className="w-full"
                  variant="outline"
                    aria-label="view users" role="button"
                >
                  View Users
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
        </Card>

        <Card className=" h-42 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="flex-1 ">
              <div className="flex items-center space-x-3">
              <div className="bg-primary-vlight  p-2 rounded-lg">
                <Activity size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Jobs</p>
                <p className="text-2xl font-thin">{noOfRuns}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/jobs`)}
                  className="w-full"
                  variant="outline"
                  aria-label="view jobs" role="button"
                >
                  View Jobs
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
        </Card>
        </div>

        <McpConnectSection venue={venue} slug={slug} />
      </div>
    </ContentLayout>
  );
}
