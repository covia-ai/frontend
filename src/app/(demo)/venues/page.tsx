
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from 'next/navigation'
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
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
          <Card 
            key={0} 
            className="shadow-md bg-slate-100 flex flex-col rounded-md hover:-translate-1 hover:shadow-xl cursor-pointer h-48 overflow-hidden"
            onClick={() => router.push('/venues/default')}
          >
            {/* Fixed-size header */}
            <div className="h-14 p-3 flex flex-row items-center justify-between border-b bg-slate-50">
              <div className="truncate flex-1 mr-2 font-semibold text-sm">Default Venue</div>
              <div className="flex space-x-2">
                <Link2 
                  color="#008800" 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("https://venue-test.covia.ai", '_blank');
                  }}
                />
                <ArrowRight size={16} className="text-muted-foreground" />
              </div>
            </div>

            {/* Flexible middle section */}
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div className="text-xs text-slate-600 line-clamp-3 mb-2">Default Covia Venue</div>
              
              {/* Fixed-size footer */}
              <div className="h-12 flex flex-row items-center justify-between">
                <div className="flex flex-row items-center space-x-2">
                  <Badge variant="default" className="border bg-secondary text-white text-xs">covia</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
