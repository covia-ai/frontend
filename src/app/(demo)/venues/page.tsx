
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from 'next/navigation'
import { VenueDetails } from "@/config/types";
import { Badge } from "@/components/ui/badge";
import { Link2, ArrowRight } from "lucide-react";

export default function OperationsPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();

  return (
    <ContentLayout title="Operations">
      <SmartBreadcrumb />

      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-evenly w-full space-x-2">
          <Search></Search>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center gap-4">
          <Card 
            key={0} 
            className="px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md hover:-translate-1 hover:shadow-xl cursor-pointer"
            onClick={() => router.push('/venues/default')}
          >
            <CardTitle className="px-2 flex flex-row items-center justify-between">
              <div>Default Venue</div>
              <div className="flex space-x-2">
                <Link2 
                  color="#008800" 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("http://localhost:8080", '_blank');
                  }}
                />
                <ArrowRight size={16} className="text-muted-foreground" />
              </div>
            </CardTitle>
            <CardContent className="flex flex-col px-2">
              <div className="text-xs text-slate-600 line-clamp-1">Default Covia Venue</div>
              <div className="flex flex-row items-center justify-start mt-4 space-x-2">
                <Badge variant="default" className="border bg-secondary text-white text-xs">covia</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
