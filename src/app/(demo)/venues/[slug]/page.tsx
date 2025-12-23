"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import { useVenue } from "@/hooks/use-venue";
import { useEffect, useState } from "react";
import { Venue, Grid, CredentialsHTTP } from "@covia-ai/covialib";
import Link from "next/link";
import { copyDataToClipBoard } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { TopBar } from "@/components/admin-panel/TopBar";

interface VenuePageProps {
  params: {
    slug: string;
  };
}

export default function VenuePage({ params }: VenuePageProps) {
  const router = useRouter();
  const { slug } = params;
  const { venues, addVenue } = useVenues();
  const { currentVenue, setCurrentVenue } = useVenue();
  const [ venue, setVenue] = useState<Venue | null>(null);
  const [ venueDID, setVenueDID] = useState("");
  const [ venueName, setVenueName] = useState("");
  const [ venueMCPUrl, setVenueMCPURL] = useState("Not Found")
  const [ noOfAssets, setNoOfAssets] = useState(0)
  const [ noOfOps, setNoOfOps] = useState(0)
  const [ noOfRuns, setNoOfRuns] = useState(0)
  const [ noOfUsers, setNoOfUsers] = useState(0)
  const { data: session } = useSession();
  
  useEffect(() => {
    // Find the venue by slug
    const foundVenue = venues.find(v => v.venueId === decodeURIComponent(slug));
    if (foundVenue) {
      if(foundVenue instanceof Venue) {
          setVenue(foundVenue);
          setVenueDID(foundVenue.venueId)
      }
      else {
          const foundVenue_obj = new Venue({baseUrl:foundVenue.baseUrl, venueId:foundVenue.venueId, name:foundVenue.name});
          setVenue(foundVenue_obj)
          setVenueDID(foundVenue_obj.venueId)
      }
     
      // Don't automatically set as current venue - only when user clicks "Make Default"
      
    }
    else {
       Grid.connect(decodeURIComponent(slug),new CredentialsHTTP(decodeURIComponent(slug),"",session?.user?.email || "")).then((venue) => {
         addVenue(venue)
       }
      )
    }
  }, [slug, venues]);

    useEffect(() => {
       const fetchMCP = async () => {
          const response = await fetch(venue?.baseUrl+"/.well-known/mcp");
          const body = await response.json();
          if(body?.error)
             setVenueMCPURL("Not Available")
          else
              setVenueMCPURL(body?.server_url)
      }
       const fetchStats = async () => {
         try {
          const status =  await venue?.getStats();
          if(status?.stats) {
              setNoOfAssets(status?.stats?.assets);
              setNoOfOps(status?.stats?.ops);
              setNoOfRuns(status?.stats?.jobs);
              setNoOfUsers(status?.stats?.users);
              setVenueDID(status?.did)
              setVenueName(status?.name)
          }
        }
        catch(e) {
          console.log(e)
        }
      }
      fetchMCP();
      fetchStats();
  }, [venue]);

  const isCurrentVenue = currentVenue?.venueId === venue?.venueId;
  if (!venue) {
    return (
      <ContentLayout>
        <SmartBreadcrumb assetOrJobName={slug}/>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Venue not found</p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar  venueName={venue.name}/>
      
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
                onClick={() => setCurrentVenue(venue)}
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
          <h2 className="text-xl font-thin mb-4">Venue Information</h2>
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
                    className="font-mono text-sm bg-muted p-2 rounded break-all"
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
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {venueDID}
                  </p>
                </div>
              </div>
            </div>
            
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary-vlight p-2 rounded-lg">
                  <Globe size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex flex-row space-x-2">MCP URL <Copy
                    size={12}
                    onClick={(e) => copyDataToClipBoard(venueMCPUrl, "MCP URL copied to clipboard")}
                    className="cursor-pointer hover:text-pink-400"></Copy>
                    </p>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {venueMCPUrl}
                  </p>
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
                  disabled
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

       
      </div>
    </ContentLayout>
  );
} 