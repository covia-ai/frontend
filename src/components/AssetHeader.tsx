'use client'

import { Asset } from "@/lib/covia";
import Link from "next/link";
import { IdAndLink } from "./IdandLink";

interface AssetHeaderProps {
  asset: Asset;
}

export const AssetHeader = ({ asset }: AssetHeaderProps) => {
  return (
    <div className="flex flex-col w-full items-center justify-center mb-2 mt-2 border border-slate-200 bg-card text-bg-card-foreground rounded-md p-4">
      <h1 className="text-xl text-bold">
        <Link href={window.location.href} className="hover:text-pink-400 hover:underline">
          {asset?.metadata?.name}
        </Link>
      </h1>
      <p className="text-m mb-4 text-card-foreground w-3/4 text-center">{asset?.metadata?.description}</p>

     <IdAndLink type="Asset" url={window.location.href} id={asset?.id}></IdAndLink>
    </div>
  );
}; 