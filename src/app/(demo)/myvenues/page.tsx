
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
import { Button } from "@/components/ui/button";
import { useSearchParams } from 'next/navigation'
import { VenueDetails } from "@/config/types";
import { Badge } from "@/components/ui/badge";
import { Edit2, Link2, PlusCircle } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
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
                        <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                        <Dialog>
                        <DialogTrigger><PlusCircle size={32} color="#636363"></PlusCircle></DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Connect to a Venue</DialogTitle>
                            <DialogDescription>
                              </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col items-center justify-center space-y-2 mt-4">
                                          <Input placeholder="Provide a title for the venue"></Input>
                                          <Input placeholder="Provide a description for the venue"></Input>
                                          <Input placeholder="Endpoint"></Input>
                                          <Button>Connect</Button>
                                </div>          
                              </DialogContent>
                              </Dialog>
                          </TooltipTrigger>
                          </Tooltip>
        </div>
  
       </div>
    </ContentLayout>
  );
}
