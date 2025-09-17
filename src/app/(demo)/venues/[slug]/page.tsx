"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Database, 
  Settings, 
  Users, 
  Globe, 
  Activity,
  ArrowRight,
  ExternalLink,
  Link as LinkIcon,
  Fingerprint,
  Copy,
  FolderUpIcon,
  ActivityIcon,
  User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import { useVenue } from "@/hooks/use-venue";
import { useEffect, useState } from "react";
import { Venue } from "@/lib/covia";
import Link from "next/link";
import { copyDataToClipBoard } from "@/lib/utils";

interface VenuePageProps {
  params: {
    slug: string;
  };
}

export default function VenuePage({ params }: VenuePageProps) {
  const router = useRouter();
  const { slug } = params;
  const { venues } = useVenues();
  const { currentVenue, setCurrentVenue } = useVenue();
  const [ venue, setVenue] = useState<Venue | null>(null);
  const [ venueDID, setVenueDID] = useState("");
  const [ venueMCPUrl, setVenueMCPURL] = useState("Not Found")
  const [ noOfAssets, setNoOfAssets] = useState(0)
  const [ noOfOps, setNoOfOps] = useState(0)
  const [ noOfRuns, setNoOfRuns] = useState(0)
  const [ noOfUsers, setNoOfUsers] = useState(0)

  useEffect(() => {
    // Find the venue by slug
    const foundVenue = venues.find(v => v.venueId === slug);
    if (foundVenue) {
      setVenue(foundVenue);
      setVenueDID(foundVenue.getDID())
      // Don't automatically set as current venue - only when user clicks "Make Default"
      
    }
  }, [slug, venues]);

    useEffect(() => {
       const fetchMCP = async () => {
          const response = await fetch(venue?.baseUrl+"/.well-known/mcp");
          const body = await response.json();
          setVenueMCPURL(body?.server_url)
      }
      const fetchDID = async () => {
          const response = await fetch(venue?.baseUrl+"/.well-known/did.json");
          const body = await response.json();
          setVenueDID(body.id)
      }
       const fetchStats = async () => {
         try {
          const status =  await venue?.getStats();
          if(status?.stats) {
              setNoOfAssets(status?.stats?.assets);
              setNoOfOps(status?.stats?.ops);
              setNoOfRuns(status?.stats?.jobs);
              setNoOfUsers(status?.stats?.users);
          }
        }
        catch(e) {
          console.log(e)
        }
      }
      fetchDID();
      fetchMCP();
      fetchStats();
  }, [venue]);

  const isCurrentVenue = currentVenue?.venueId === venue?.venueId;
  if (!venue) {
    return (
      <ContentLayout title="Venue Not Found">
        <SmartBreadcrumb />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Venue not found</p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title={venue.name}>
      <SmartBreadcrumb />
      
      <div className="flex flex-col space-y-6">
        {/* Venue Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-secondary-vlight p-3 rounded-lg">
                <Building2 size={32} className="text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{venue.name}</h1>
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
                className="flex items-center space-x-2"
              >
                <ExternalLink size={16} />
                <span>Open Venue</span>
              </Button>
              
              <Button 
                onClick={() => setCurrentVenue(venue)}
                variant={isCurrentVenue ? "default" : "secondary"}
                className="flex items-center space-x-2"
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
          <h2 className="text-xl font-semibold mb-4">Venue Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-vlight p-2 rounded-lg">
                  <LinkIcon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex flex-row space-x-2">Venue URL <Copy
                    size={12}
                    onClick={(e) => copyDataToClipBoard(venue.baseUrl, "Venue URL copied to clipboard")}
                    className="cursor-pointer hover:text-pink-400"
                  /></p>
                  
                  <Link 
                    href={venue.baseUrl} 
                    target="_blank"
                    className="font-mono text-sm bg-gray-100 p-2 rounded break-all"
                  >
                    {venue.baseUrl}
                  </Link>
                 
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="bg-primary-vlight p-2 rounded-lg">
                  <Fingerprint size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex flex-row space-x-2">Venue DID
                 <Copy
                    size={12}
                    onClick={(e) => copyDataToClipBoard(venueDID, "Venue DID copied to clipboard")}
                    className="cursor-pointer hover:text-pink-400"></Copy>
                    </p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                    {venueDID}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-vlight p-2 rounded-lg">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex flex-row space-x-2">Venue ID <Copy
                    size={12}
                    onClick={(e) => copyDataToClipBoard(venue.venueId, "Venue ID copied to clipboard")}
                    className="cursor-pointer hover:text-pink-400"></Copy>
                    </p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {venue.venueId}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="bg-primary-vlight p-2 rounded-lg">
                  <Globe size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex flex-row space-x-2">MCP URL <Copy
                    size={12}
                    onClick={(e) => copyDataToClipBoard(venueMCPUrl, "MCP URL copied to clipboard")}
                    className="cursor-pointer hover:text-pink-400"></Copy>
                    </p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                    {venueMCPUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className=" h-42 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardHeader className="flex-1 ">
              <div className="flex items-center space-x-3">
              <div className="bg-primary-vlight  p-2 rounded-lg">
                <Database size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-2xl font-bold">{noOfAssets}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/assets`)}
                  className="w-full"
                  variant="outline"
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
                <p className="text-2xl font-bold">{noOfOps}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/operations`)}
                  className="w-full"
                  variant="outline"
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
                <Users size={20} className="text-primary" />
              </div>
              <div className="">
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{noOfUsers}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  disabled
                  className="w-full"
                  variant="outline"
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
                <p className="text-2xl font-bold">{noOfRuns}</p>
              </div>
            </div>
            </CardHeader>
            <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/history`)}
                  className="w-full"
                  variant="outline"
                >
                  View Jobs
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
        </Card>
        </div>

       {/* <Separator />
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-48">
              <CardHeader className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="bg-secondary-vlight p-3 rounded-lg">
                    <Database size={24} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assets</p>
                   <p className="text-2xl font-bold">{noOfAssets}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="bg-red-400">
                <Button 
                  onClick={() => router.push(`/venues/${slug}/assets`)}
                  className="w-full"
                  variant="outline"
                >
                  View Assets
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-48">
              <CardHeader className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="bg-secondary-vlight p-2 rounded-lg">
                    <Settings size={24} className="text-secondary" />
                  </div>
                  <div>
                    <CardTitle>Operations</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage venue operations</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/operations`)}
                  className="w-full"
                  variant="outline"
                >
                  View Operations
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-48">
              <CardHeader className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="bg-secondary-vlight p-2 rounded-lg">
                     <Activity size={20} className="text-secondary" />
                  </div>
                  <div>
                    <CardTitle>History</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage venue history</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push(`/venues/${slug}/history`)}
                  className="w-full"
                  variant="outline"
                >
                  View History
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        */}
      </div>
    </ContentLayout>
  );
} 