
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import React from 'react'


import { Button } from "@/components/ui/button";
import { Card, CardContent,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CircleArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MagicWandIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function HomePage() {


  return (
    <ContentLayout title="Workspace">
       
        <div id="" className=" ">

            <div className="flex flex-col items-center justify-center py-10 px-10  my-4 ">
                <h3 className="text-center text-2xl  font-bold">
                How can I help you in  {" "}
                  <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                     being more productive
                  </span>
                </h3>
                <p className="text-xl text-muted-foreground text-center mt-4 mb-8">
                 Create your first flow with AI or check out our guided tutorials below

                </p>
              <div className="flex flex-row items-center justify-center w-full space-x-4">
                  <Input
                    placeholder="Build me an orchestration ....."
                    className="bg-muted/50 dark:bg-muted/80 w-8/12"
                    aria-label="email"
                  />
                  <Button variant="default" disabled className="my-4"><MagicWandIcon></MagicWandIcon>Coming Soon</Button>
                  </div>
             
            </div>
             <Separator/>
             <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
               <h3 className="text-center text-2xl  font-bold">
                Try some   {" "}
                  <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                     usecases
                  </span>
                </h3>
                  <p className="text-xl text-muted-foreground text-center mt-4 mb-8">
                 Create your first flow with AI or check out our guided tutorials below

                </p>
              <div className="grid grid-cols-1 md:grid-cols-3 items-stretch justify-center gap-4 mt-4 mb-8">
                
                     <Card className="shadow-md bg-slate-100 flex flex-col rounded-md hover:-translate-1 hover:shadow-xl h-48 overflow-hidden">
                              {/* Fixed-size header */}
                              <div className="h-14 p-3 flex flex-row items-center justify-between border-b bg-slate-50">
                                <div className="truncate flex-1 font-semibold text-sm">Web Scraping</div>
                              </div>
                              
                              {/* Flexible middle section */}
                              <div className="flex-1 p-3 flex flex-col justify-between">
                                <div className="text-xs text-slate-600 line-clamp-3 mb-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                                
                                {/* Fixed-size footer */}
                                <div className="h-12 flex flex-row items-center justify-between">
                                  <Badge variant="outline" className="border border-pink-200 bg-white">orchestration</Badge>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CircleArrowRight color="#6B46C1" />
                                    </TooltipTrigger>
                                    <TooltipContent>View Asset</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                        </Card>
                        <Card className="shadow-md bg-slate-100 flex flex-col rounded-md hover:-translate-1 hover:shadow-xl h-48 overflow-hidden">
                              {/* Fixed-size header */}
                              <div className="h-14 p-3 flex flex-row items-center justify-between border-b bg-slate-50">
                                <div className="truncate flex-1 font-semibold text-sm">Document Classification</div>
                              </div>
                              
                              {/* Flexible middle section */}
                              <div className="flex-1 p-3 flex flex-col justify-between">
                                <div className="text-xs text-slate-600 line-clamp-3 mb-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                                
                                {/* Fixed-size footer */}
                                <div className="h-12 flex flex-row items-center justify-between">
                                  <Badge variant="outline" className="border border-pink-200 bg-white">orchestration</Badge>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CircleArrowRight color="#6B46C1" />
                                    </TooltipTrigger>
                                    <TooltipContent>View Asset</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                        </Card>
                             <Card className="shadow-md bg-slate-100 flex flex-col rounded-md hover:-translate-1 hover:shadow-xl h-48 overflow-hidden">
                              {/* Fixed-size header */}
                              <div className="h-14 p-3 flex flex-row items-center justify-between border-b bg-slate-50">
                                <div className="truncate flex-1 font-semibold text-sm">Request Approval</div>
                              </div>
                              
                              {/* Flexible middle section */}
                              <div className="flex-1 p-3 flex flex-col justify-between">
                                <div className="text-xs text-slate-600 line-clamp-3 mb-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                                
                                {/* Fixed-size footer */}
                                <div className="h-12 flex flex-row items-center justify-between">
                                  <Badge variant="outline" className="border border-pink-200 bg-white">orchestration</Badge>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CircleArrowRight color="#6B46C1" />
                                    </TooltipTrigger>
                                    <TooltipContent>View Asset</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                        </Card>
                      
              </div>   
             </div>
      </div>
       
   </ContentLayout>
  );
}
