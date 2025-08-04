
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
import React from 'react'


import { Button } from "@/components/ui/button";
import { Card, CardContent,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CircleArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MagicWandIcon } from "@radix-ui/react-icons";


export default function HomePage() {


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
            <BreadcrumbPage>Workspace</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
       
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
                  <Button variant="default" className="my-4"><MagicWandIcon></MagicWandIcon></Button>
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
              <div className="grid grid-cols-3 items-center justify-center space-x-8  mt-4 mb-8">
                
                     <Card className=" px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl t-pink-400">
                              <CardTitle  className="px-2">Web Scraping</CardTitle>                         
                              <CardContent className="flex flex-col px-2">
                              <div className="text-xs text-slate-600 mt-2 line-clamp-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                               <div className="flex flex-row items-center justify-between mt-4">
                                                   <Badge variant="outline" className="border border-pink-200 bg-white">orchestration</Badge>
                                                   <CircleArrowRight color="#6B46C1"/>
                                                </div>
                              </CardContent>                 
                        </Card>
                        <Card className=" px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl t-pink-400">
                              <CardTitle  className="px-2">Document Classification</CardTitle>                         
                              <CardContent className="flex flex-col px-2">
                              <div className="text-xs text-slate-600 mt-2 line-clamp-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                               <div className="flex flex-row items-center justify-between mt-4">
                                                 <Badge variant="outline" className="border border-pink-200 bg-white">orchestration</Badge>
                                                  <CircleArrowRight color="#6B46C1"/>
                                                </div>
                              </CardContent>                    
                        </Card>
                             <Card className=" px-2 w-64 h-38 shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl t-pink-400">
                              <CardTitle  className="px-2">Request Approval</CardTitle>                         
                              <CardContent className="flex flex-col px-2">
                              <div className="text-xs text-slate-600 mt-2 line-clamp-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                               <div className="flex flex-row items-center justify-between mt-4">
                                  <Badge variant="outline" className="border border-pink-200 bg-white">orchestration</Badge>
                                  <CircleArrowRight color="#6B46C1" />
                              </div>
                              </CardContent>
                        </Card>
                      
              </div>   
             </div>
      </div>
       
   </ContentLayout>
  );
}
