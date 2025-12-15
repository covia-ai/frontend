"use client";


import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, Venue } from "@covia-ai/covialib";
import React, { useEffect, useMemo, useState } from 'react'
import { AssetCard } from "./AssetCard";
import { useVenues } from "@/hooks/use-venues";


export const ShowCase = () => {
   const [loading, setLoading] = useState(true);
   const [assets, setAssets] = useState<Asset[]>([]);
   const { venues } = useVenues();
   const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());

    if(venues.length == 0)
      return (
       <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
          <h3 className="text-center text-4xl  font-bold">
            Try some   {" "}
            <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              sample Grid operations
            </span>
          </h3>
            <div className="flex flex-col items-center justify-center w-full h-32 space-y-2">
            <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available assets & operations</div>
        </div>
        </div>
      );
    
   useEffect(() => {
     const fetchData = async () => {
      const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId})
      
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
         setAssets(shuffled.slice(0, 3));
       } catch (error) {
         console.error('Error fetching featured asset data:', error);
         setAssets([]);
       } finally {
         setLoading(false);
       }
     };
     fetchData();
   }, [venueObj?.baseUrl, venueObj?.venueId]); // Empty dependency array to run once on mount
 

      return (
        <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
          <h3 className="text-center text-4xl  font-bold">
            Try some   {" "}
            <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              sample Grid operations
            </span>
          </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 items-stretch justify-center gap-4 mt-4 mb-8 w-full">

              {assets.map((asset, index) =>

                <AssetCard key={index} asset={asset} type="operations"/>
              )}
        </div>
        </div>
      )
  
};
