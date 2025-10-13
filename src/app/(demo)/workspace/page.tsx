
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CircleArrowRight, SquareArrowOutUpRight } from "lucide-react";
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
import { Iconbutton } from "@/components/Iconbutton";
import { AssetCard } from "@/components/AssetCard";

export default function HomePage() {

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const router = useRouter();

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

  return (
    <ContentLayout title="Workspace">
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

      <Separator />

      <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
        <h3 className="text-center text-4xl  font-bold">
          Try some   {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            sample Grid operations
          </span>
        </h3>


        {loading &&
          <div className="flex flex-row items-center justify-center w-full">
            <Spinner variant="ellipsis" className="text-primary" size={32} />
          </div>
        }
        {!loading &&

          <div className="grid grid-cols-1 md:grid-cols-3 items-stretch justify-center gap-4 mt-4 mb-8 w-full">

            {assets.map((asset, index) =>

              <AssetCard key={index} asset={asset} type="operations" venueSlug={venue.venueId}/>
            )}
          </div>}
      </div>
    </ContentLayout>
  );
}
