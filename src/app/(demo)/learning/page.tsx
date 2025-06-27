
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
import ReactPlayer from 'react-player'


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LibraryBigIcon, MessagesSquare, Play } from "lucide-react";

export default function OperationsPage() {

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
            <BreadcrumbPage>Learning Corner</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
       
        <div id="" className=" ">

            
             <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
              
                <div className="flex flex-row space-x-4 items-center ">
                  <ReactPlayer url='https://www.youtube.com/watch?v=LXb3EKWsInQ' />
                  <div className="flex flex-col">
                    <Card className="h-1/2 m-2 bg-pink-50 px-2"> 
                       <CardHeader>
                        <LibraryBigIcon size={38} color="#6f6f6f" className="bg-white rounded-md p-2"/>
                        <CardTitle>Learning Corner</CardTitle>
                       </CardHeader>
                       <CardContent className="text-sm text-slate-600">
                        Join the learning corner to learn more about Covia</CardContent>
                    </Card>
                    <Card className="h-1/2 m-2 bg-blue-50 px-2"> 
                       <CardHeader>
                        <MessagesSquare size={38} color="#6f6f6f" className="bg-white rounded-md p-2"/>
                        <CardTitle>Covia Forum</CardTitle>
                       </CardHeader>
                       <CardContent className="text-sm text-slate-600">
                        Join the forum for information and discussions</CardContent>
                    </Card>
                  </div>
                 </div>
                  
             </div>
      </div>
       
   </ContentLayout>
  );
}
