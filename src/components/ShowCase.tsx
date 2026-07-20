"use client";


import { Asset, Operation } from "@covia/covia-sdk";
import React, { useEffect, useState } from 'react'
import { Loader2 } from "lucide-react";
import { AssetCard } from "./AssetCard";
import { useVenues } from "@/hooks/use-venues";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { PageHeading } from "./PageHeading";


export const ShowCase = () => {
   const [loading, setLoading] = useState(true);
   const [assets, setAssets] = useState<Asset[]>([]);
   const { venues } = useVenues();
   const venue = useAuthenticatedVenue();

   useEffect(() => {
     let ignore = false;
     const fetchData = async () => {
      if (!venue) return;
       try {
         // Featured showcase items are operations, and the catalog returns
         // every operation's metadata inline in two job-free reads — no need
         // to hydrate the venue's entire asset store one GET at a time.
         const ops = await listCatalogOperations(venue);
         const featured = ops
           .filter((op) => op.metadata?.operation?.info?.featured)
           .map((op) => new Operation(op.path, venue, op.metadata));
         const shuffled = featured.slice();
         for (let i = shuffled.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           if (i !== j) {
             [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
           }
         }
         if (!ignore) setAssets(shuffled.slice(0, 3));
       } catch (error) {
         console.error('Error fetching featured asset data:', error);
         if (!ignore) setAssets([]);
       } finally {
         if (!ignore) setLoading(false);
       }
     };
     fetchData();
     return () => { ignore = true; };
   }, [venue]);

    if(venues.length == 0)
      return (
       <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
          <PageHeading text="Try some" highlight="sample Grid operations" />
            <div className="flex flex-col items-center justify-center w-full h-32 space-y-2">
            <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available assets & operations</div>
        </div>
        </div>
      );

      return (
        <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
          <PageHeading text="Try some" highlight="sample Grid operations" />
        {loading ? (
          <div className="flex items-center justify-center w-full h-32 mt-6">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-32 space-y-2 mt-6">
            <div className="text-card-foreground text-sm">No featured operations available on this venue.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4 mt-6 mb-8">
            {assets.map((asset) =>
              <AssetCard key={asset.id} asset={asset} type="operations" compact={true} venue={venue ?? undefined}/>
            )}
          </div>
        )}
        </div>
      )
  
};
