"use client";


import { Asset } from "@covia/covia-sdk";
import React, { useEffect, useState } from 'react'
import { AssetCard } from "./AssetCard";
import { useVenues } from "@/hooks/use-venues";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";


export const ShowCase = () => {
   const [loading, setLoading] = useState(true);
   const [assets, setAssets] = useState<Asset[]>([]);
   const { venues } = useVenues();
   const venue = useAuthenticatedVenue();

   useEffect(() => {
     const fetchData = async () => {
      if (!venue) return;
       try {
         const assetList = await venue.listAssets();
         const res = await Promise.all(assetList.items.map((assetId: string) => venue.getAsset(assetId)));
         const featured = res.filter((asset: Asset) => asset?.metadata?.operation?.info?.featured);
         const shuffled = featured.slice();
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
   }, [venue]);

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

      return (
        <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
          <h3 className="text-center text-4xl  font-bold">
            Try some   {" "}
            <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              sample Grid operations
            </span>
          </h3>
        {!loading && assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-32 space-y-2 mt-4">
            <div className="text-card-foreground text-sm">No featured operations available on this venue.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4 mt-4 mb-8">
            {assets.map((asset, index) =>
              <AssetCard key={index} asset={asset} type="operations" compact={true}/>
            )}
          </div>
        )}
        </div>
      )
  
};
