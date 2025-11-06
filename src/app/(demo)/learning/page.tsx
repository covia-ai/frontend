
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
import { VideoSlideShow } from "@/components/VideoSlideShow";

export default function OperationsPage() {

  return (
    <ContentLayout title="Operations">
      <SmartBreadcrumb />
       
        <div id="" className=" ">

            
             <div className="flex flex-col items-center justify-center py-10 px-10 my-4">
              
                <VideoSlideShow/>

                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group h-64 bg-card ">
                    <CardHeader className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary-light p-3 rounded-lg">
                          <MessagesSquare size={32} color="white" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>Covia AI Discord</span>
                            <ExternalLink size={16} className="text-card-foreground" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">Join our community</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-between">
                      <p className="text-sm text-foreground mb-4">
                        Connect with the Covia AI community, get help, share ideas, and stay updated with the latest developments.
                      </p>
                      <Button 
                        onClick={() => window.open('https://discord.gg/fywdrKd8QT', '_blank')}
                        className="w-full bg-primary-light  text-white hover:text-black"
                      >
                        Join Discord Server
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group h-64 text-card-foreground">
                    <CardHeader className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="bg-secondary-light p-3 rounded-lg">
                          <LibraryBigIcon size={32} color="white" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>Covia Documentation</span>
                            <ExternalLink size={16} className="text-card-foreground" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">Learn and explore</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-between">
                      <p className="text-sm text-slate-600 mb-4">
                        Comprehensive documentation, tutorials, API references, and guides to help you master Covia AI.
                      </p>
                      <Button 
                        onClick={() => window.open('https://docs.covia.ai', '_blank')}
                        className="w-full bg-secondary-light  text-white hover:text-black hover:bg-secondary-light"
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
