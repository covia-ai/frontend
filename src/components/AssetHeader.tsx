'use client'

import { Asset, Namespace, assetHash, didUrl, parseDidUrl } from "@covia/covia-sdk";
import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy } from "lucide-react";

interface AssetHeaderProps {
  asset: Asset;
}

// The copyable lattice address for an asset, derived from its actual identity:
// asset.id is the address the asset was resolved from (a content hash for
// getAsset, a catalogue path for resolveOperationByAddress). The venue DID
// comes from the asset's own Venue instance, and all address parsing/building
// stays in the SDK — nothing is re-derived from the route or from metadata
// (the old adapter-based path pointed test ops at v/ops/... where they don't
// live, and the pathname-derived DID broke off the /venues/[slug] routes).
function assetDidUrl(asset: Asset): string | null {
  const id = String(asset?.id ?? "");
  if (!id) return null;

  const parsed = parseDidUrl(id);
  if (parsed.did) return id; // already fully qualified

  const hash = assetHash(id);
  const venueDid = asset.venue?.venueId || null;
  if (hash) return didUrl(venueDid, Namespace.ASSET, hash);

  // Multi-segment lattice path. Only the venue catalogue (v/...) is owned by
  // the venue's DID; w/o/g/j/s paths belong to the caller, so leave them
  // namespace-relative rather than mint an address under the wrong owner.
  if (parsed.namespace && parsed.path) {
    const ownerDid = parsed.namespace === Namespace.VENUE ? venueDid : null;
    return didUrl(ownerDid, parsed.namespace, parsed.path);
  }
  return null;
}

export const AssetHeader = ({ asset }: AssetHeaderProps) => {
  const didUrlText = assetDidUrl(asset);

  return (
    <div className="flex flex-col w-full mb-2 mt-2 border border-slate-200 bg-card text-bg-card-foreground rounded-md p-2">
      <div className="flex flex-col items-start justify-between w-full ">

             <span>{asset?.metadata?.name}</span>
              <p data-testid="assetH_descr"  className="line-clamp-2 text-sm text-card-foreground ">{asset?.metadata?.description}</p>
      </div>

      {didUrlText && (
        <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-full text-xs mt-2">
          <Tooltip>
            <TooltipTrigger>
              <div data-testid="idcopy_btn" className="p-1 flex flex-row mr-1 border border-border text-muted-foreground rounded-md w-full space-x-2">
                <div className="select-text text-[10px] w-full">{didUrlText}</div>
                <Copy size={10} onClick={() => copyDataToClipBoard(didUrlText, "DID URL copied to clipboard")} />
              </div>
            </TooltipTrigger>
            <TooltipContent>DID URL</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
