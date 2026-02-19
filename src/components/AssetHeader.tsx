'use client'

import { Asset } from "@covia/covialib";
import Link from "next/link";
import { IdAndLink } from "./IdandLink";

interface AssetHeaderProps {
  asset: Asset;
}

export const AssetHeader = ({ asset }: AssetHeaderProps) => {
  return (
    <div className="flex flex-col w-full mb-2 mt-2 border border-slate-200 bg-card text-bg-card-foreground rounded-md p-2">
      <div className="flex flex-col items-start justify-between w-full ">
             
             <span>{asset?.metadata?.name}</span>
              <p data-testid="assetH_descr"  className="line-clamp-2 text-sm text-card-foreground ">{asset?.metadata?.description}</p>
      </div>

            <IdAndLink type="Asset" url={window.location.href} id={asset?.id}></IdAndLink>

   
    </div>
  );
}; 