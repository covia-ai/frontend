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
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";

interface VenuePageProps {
  params: {
    slug: string;
  };
}

export default function VenuePage({ params }: VenuePageProps) {
  const router = useRouter();
  const { slug } = params;

  // Mock venue data - in a real app, this would come from an API
  const venueData = {
    name: slug === "default" ? "Default Venue" : `${slug.charAt(0).toUpperCase() + slug.slice(1)} Venue`,
    description: "A Covia venue for managing assets and operations",
    status: "active",
    type: "covia",
    url: "http://localhost:8080",
    stats: {
      assets: 24,
      operations: 12,
      runs: 156,
      users: 8
    }
  };

  return (
    <ContentLayout title={venueData.name}>
      <SmartBreadcrumb />
      
      <div className="flex flex-col space-y-6">
        {/* Venue Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building2 size={32} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{venueData.name}</h1>
                <p className="text-muted-foreground">{venueData.description}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {venueData.status}
                  </Badge>
                  <Badge variant="outline">{venueData.type}</Badge>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => window.open(venueData.url, '_blank')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ExternalLink size={16} />
              <span>Open Venue</span>
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Database size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-2xl font-bold">{venueData.stats.assets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Settings size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Operations</p>
                <p className="text-2xl font-bold">{venueData.stats.operations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Activity size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Runs</p>
                <p className="text-2xl font-bold">{venueData.stats.runs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Users size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{venueData.stats.users}</p>
              </div>
            </div>
          </Card>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Database size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Assets</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage venue assets</p>
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

            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Settings size={24} className="text-green-600" />
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
          </div>
        </div>
      </div>
    </ContentLayout>
  );
} 