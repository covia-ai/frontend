
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import React from 'react'
import ReactPlayer from 'react-player'


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LibraryBigIcon, MessagesSquare, Play, ExternalLink } from "lucide-react";

export default function OperationsPage() {

  return (
    <ContentLayout title="Operations">
      <SmartBreadcrumb />
       
        <div id="" className=" ">

            
             <div className="flex flex-col items-center justify-center py-10 px-10 my-4">
              
                <div className="flex flex-row space-x-4 items-center mb-8">
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

                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="bg-[#5865F2] p-3 rounded-lg">
                          <MessagesSquare size={32} color="white" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            Covia AI Discord
                            <ExternalLink size={16} className="text-muted-foreground" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">Join our community</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-4">
                        Connect with the Covia AI community, get help, share ideas, and stay updated with the latest developments.
                      </p>
                      <Button 
                        onClick={() => window.open('https://discord.gg/WY2fvFgcQW', '_blank')}
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                      >
                        Join Discord Server
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-3 rounded-lg">
                          <LibraryBigIcon size={32} color="white" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            Covia Documentation
                            <ExternalLink size={16} className="text-muted-foreground" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">Learn and explore</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-4">
                        Comprehensive documentation, tutorials, API references, and guides to help you master Covia AI.
                      </p>
                      <Button 
                        onClick={() => window.open('https://docs.covia.ai', '_blank')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        View Documentation
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                  
             </div>
      </div>
       
   </ContentLayout>
  );
}
