
"use client";

import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Search } from "@/components/search";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useSearchParams } from 'next/navigation'
import { VenueDetails } from "@/config/types";
import { Badge } from "@/components/ui/badge";
import {  Link2 } from "lucide-react";

export default function OperationsPage() {
    const searchParams = useSearchParams()
    const search = searchParams.get('search');
  
  
  return (
    <ContentLayout title="Operations">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Venues</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
       
      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-evenly w-full space-x-2">
                        <Search></Search>  
                        
        </div>
               <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center gap-4">
            
                    
                              
                             <Card key={0} className="px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl">
                                        <CardTitle  className="px-2 flex flex-row items-center justify-between">
                                          
                                            <div>Default Venue</div>
                                            <Link href="https://localhost:8080"><Link2 color="#008800"></Link2></Link>
                                        </CardTitle>
                                        <CardContent className="flex flex-col px-2"> 
                                                <div className="text-xs text-slate-600 line-clamp-1">Default Covia Venue</div>
                                                <div className="flex flex-row items-center justify-start mt-4 space-x-2">
                                                  <Badge variant="outline" className="border bg-white border-pink-200 ">covia</Badge> 
                                                </div>

                                          </CardContent>
                            </Card>
                                    
       
       </div>
       </div>
    </ContentLayout>
  );
}
