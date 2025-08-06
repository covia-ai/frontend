'use client'

import { Asset } from "@/lib/covia";
import { Copy } from "lucide-react";
import { copyDataToClipBoard } from "@/lib/utils";
import Link from "next/link";

interface AssetHeaderProps {
  asset: Asset;
}

export const AssetHeader = ({ asset }: AssetHeaderProps) => {
  return (
    <div className="flex flex-col w-full items-center justify-center mb-2 mt-2 border-2 border-slate-200 rounded-md p-4">
      <h1 className="text-xl text-bold">
        <Link href={window.location.href} className="hover:text-pink-400 hover:underline">
          {asset?.metadata?.name}
        </Link>
      </h1>
      <p className="text-m mb-4 text-slate-600 w-3/4 text-center">{asset?.metadata?.description}</p>

      <div className="flex flex-row-reverse space-x-4 space-x-reverse w-full justify-center">
        <div className="flex flex-row ">
          <span className="text-xs mr-1">ID: </span>
          <span className="text-xs mr-1 font-mono">{asset?.id}</span>
          <span>
            <Copy
              size={12}
              onClick={(e) => copyDataToClipBoard(asset?.id, "AssetId copied to clipboard")}
              className="cursor-pointer hover:text-pink-400"
            />
          </span>
        </div>
      </div>
    </div>
  );
}; 