'use client'

import { usePathname } from "next/navigation";
import { Asset } from "@covia/covia-sdk";
import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy } from "lucide-react";

interface AssetHeaderProps {
  asset: Asset;
}

export const AssetHeader = ({ asset }: AssetHeaderProps) => {
  const pathname = usePathname();
  const venueDid = decodeURIComponent(pathname.split("/")[2] ?? "");
  const catalogPath = asset?.metadata?.operation?.adapter
    ? `v/ops/${asset.metadata.operation.adapter.replace(':', '/')}`
    : null;
  const didUrl = catalogPath ? `${venueDid}/${catalogPath}` : null;

  return (
    <div className="flex flex-col w-full mb-2 mt-2 border border-slate-200 bg-card text-bg-card-foreground rounded-md p-2">
      <div className="flex flex-col items-start justify-between w-full ">

             <span>{asset?.metadata?.name}</span>
              <p data-testid="assetH_descr"  className="line-clamp-2 text-sm text-card-foreground ">{asset?.metadata?.description}</p>
      </div>

      {didUrl && (
        <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-full text-xs mt-2">
          <Tooltip>
            <TooltipTrigger>
              <div data-testid="idcopy_btn" className="p-1 flex flex-row mr-1 border border-border text-muted-foreground rounded-md w-full space-x-2">
                <div className="select-text text-[10px] w-full">{didUrl}</div>
                <Copy size={10} onClick={() => copyDataToClipBoard(didUrl, "DID URL copied to clipboard")} />
              </div>
            </TooltipTrigger>
            <TooltipContent>DID URL</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}; 