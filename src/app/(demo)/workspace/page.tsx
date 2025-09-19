
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CircleArrowRight } from "lucide-react";
import { MagicWandIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, Operation, Venue } from "@/lib/covia";
import { useRouter } from "next/navigation";
import { Spinner } from '@/components/ui/shadcn-io/spinner';

export default function HomePage() {

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const router = useRouter();
  
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
    if (!venueObj) return null;
    const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await venue.getAssets();
        const featured = res.filter((asset: Asset) => asset?.metadata?.operation?.info?.featured);
        const shuffled = featured.slice(); // copy array
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          if (i !== j) {
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
        }
        setAssets(shuffled.slice(0,3));
      } catch (error) {
        console.error('Error fetching featured asset data:', error);
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Empty dependency array to run once on mount

  return (
    <ContentLayout title="Workspace">
       
        <div id="" className=" ">

            <div className="flex flex-col items-center justify-center py-10 px-10  my-4 ">
                <h3 className="text-center text-4xl  font-bold">
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
               <h3 className="text-center text-4xl  font-bold">
                Try some   {" "}
                  <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                     sample Grid operations
                  </span>
                </h3>
                  <p className="text-xl text-muted-foreground text-center mt-4 mb-8">
                 Create your first flow with AI or check out our guided tutorials below

                </p>
              
                  {loading && 
                        <div className="flex flex-row items-center justify-center w-full">
                          <Spinner variant="ellipsis" className="text-primary" size={32}/>
                        </div>
                  }
                  {!loading && 
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 items-stretch justify-center gap-4 mt-4 mb-8 w-full">
                    
                    {assets.map((asset, index) =>
                  
                     <Card key={asset.id} className="shadow-md h-full bg-slate-100 flex flex-col rounded-md hover:border-accent hover:border-2 h-48">
                    {/* Fixed-size header */}                
                    
                      <div className="h-14 p-2 flex flex-row items-center border-b bg-slate-50">
                      <div className="truncate flex-1 mr-2 font-semibold text-sm"
                      onClick={() => { router.push("/venues/"+venue.venueId+"/operations/" + asset.id) }}>{asset.metadata.name || 'Unnamed Asset'}  
                      </div>   
                      </div>
                    {/* Flexible middle section */}
                  <div className="flex-1 p-2 flex flex-col justify-between" onClick={() => { router.push("/venues/"+venue.venueId+"/operations/" + asset.id) }}>
                    <div className="text-xs text-slate-600 line-clamp-3 mb-2">{asset.metadata.description || 'No description available'}</div>
                  </div>
                  {/* Fixed-size footer */}
                    <div className="p-2 h-12 flex flex-row-reverse items-center justify-between" onClick={() => { router.push("/venues/"+venue.venueId+"/operations/" + asset.id) }}>
                      <Tooltip>
                        <TooltipTrigger>
                          <CircleArrowRight color="#6B46C1" onClick={() => { router.push("/venues/"+venue.venueId+"/operations/" + asset.id) }} />
                        </TooltipTrigger> 
                        <TooltipContent>View Operation</TooltipContent>
                        </Tooltip> 
                    </div>
                     </Card>
                     )}
                   </div>}
                    
               </div>
      </div>
       
   </ContentLayout>
  );
}
