"use client";


import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, Operation, Venue } from "@/lib/covia";
import React, { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";

export const ShowCase = () => {
   const [loading, setLoading] = useState(true);
   const [assets, setAssets] = useState<Asset[]>([]);

   const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
   if (!venueObj) return null;
   const venue = new Venue({ baseUrl: venueObj.baseUrl, venueId: venueObj.venueId })
 
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
         setAssets(shuffled.slice(0, 3));
       } catch (error) {
         console.error('Error fetching featured asset data:', error);
         setAssets([]);
       } finally {
         setLoading(false);
       }
     };
     fetchData();
   }, []); // Empty dependency array to run once on mount
 
  
  if(loading) {
    return (
     <div className="flex flex-row items-center justify-center w-full mt-4">
            <Spinner variant="ellipsis" className="text-primary" size={32} />
          </div>
    )
  }
  else {
      return (
          <div className="grid grid-cols-1 md:grid-cols-3 items-stretch justify-center gap-4 mt-4 mb-8 w-full">

              {assets.map((asset, index) =>

                <AssetCard key={index} asset={asset} type="operations" venueSlug={venue.venueId}/>
              )}
          </div>
      )
  }
};
