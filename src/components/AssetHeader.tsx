'use client'

import { Asset, Namespace, assetHash, didUrl, parseDidUrl } from "@covia/covia-sdk";
import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy } from "lucide-react";
import Link from "next/link";

interface AssetHeaderProps {
  asset: Asset;
}

type ResolvedDidUrl = { text: string; href: string | null };

// A DID-qualified `a/<hash>` or `v/<path>` resolves to this app's own asset or
// operation viewer for that exact venue — anything else (a bare namespace-
// relative path with no owning DID) has nowhere venue-scoped to send you.
function didUrlHref(did: string | null, namespace: string | null, path: string): string | null {
  if (!did || !namespace) return null;
  const venueSegment = encodeURIComponent(did);
  if (namespace === Namespace.ASSET) return `/venues/${venueSegment}/assets/${path}`;
  if (namespace === Namespace.VENUE) return `/venues/${venueSegment}/operations/${path}`;
  return null;
}

// The copyable lattice address for an asset, derived from its actual identity:
// asset.id is the address the asset was resolved from (a content hash for
// getAsset, a catalogue path for resolveOperationByAddress). The venue DID
// comes from the asset's own Venue instance, and all address parsing/building
// stays in the SDK — nothing is re-derived from the route or from metadata
// (the old adapter-based path pointed test ops at v/ops/... where they don't
// live, and the pathname-derived DID broke off the /venues/[slug] routes).
function assetDidUrl(asset: Asset): ResolvedDidUrl | null {
  const id = String(asset?.id ?? "");
  if (!id) return null;

  const parsed = parseDidUrl(id);
  if (parsed.did) {
    // Already fully qualified.
    return { text: id, href: didUrlHref(parsed.did, parsed.namespace, parsed.path) };
  }

  const hash = assetHash(id);
  const venueDid = asset.venue?.venueId || null;
  if (hash) {
    return { text: didUrl(venueDid, Namespace.ASSET, hash), href: didUrlHref(venueDid, Namespace.ASSET, hash) };
  }

  // Multi-segment lattice path. Only the venue catalogue (v/...) is owned by
  // the venue's DID; w/o/g/j/s paths belong to the caller, so leave them
  // namespace-relative rather than mint an address under the wrong owner.
  if (parsed.namespace && parsed.path) {
    const ownerDid = parsed.namespace === Namespace.VENUE ? venueDid : null;
    return {
      text: didUrl(ownerDid, parsed.namespace, parsed.path),
      href: didUrlHref(ownerDid, parsed.namespace, parsed.path),
    };
  }
  return null;
}

export const AssetHeader = ({ asset }: AssetHeaderProps) => {
  const didUrlInfo = assetDidUrl(asset);

  return (
    <div className="flex flex-col w-full mb-2 mt-2 border border-slate-200 bg-card text-bg-card-foreground rounded-md p-2">
      <div className="flex flex-col items-start justify-between w-full ">

             <span>{asset?.metadata?.name}</span>
              <p data-testid="assetH_descr"  className="line-clamp-2 text-sm text-card-foreground ">{asset?.metadata?.description}</p>
      </div>

      {didUrlInfo && (
        <div className="flex flex-row items-start justify-center w-full text-xs mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div data-testid="idcopy_btn" className="p-1 flex flex-row items-center w-fit max-w-full border border-border text-muted-foreground rounded-md space-x-2">
                {didUrlInfo.href ? (
                  <Link
                    href={didUrlInfo.href}
                    className="select-text text-[10px] hover:text-secondary hover:underline"
                  >
                    {didUrlInfo.text}
                  </Link>
                ) : (
                  <div className="select-text text-[10px]">{didUrlInfo.text}</div>
                )}
                <Copy
                  size={10}
                  className="shrink-0 cursor-pointer"
                  onClick={() =>
                    didUrlInfo.href
                      // A bare DID URL isn't something anyone else can open —
                      // copy an absolute link to this app's own viewer instead.
                      ? copyDataToClipBoard(`${window.location.origin}${didUrlInfo.href}`, "Asset Url copied to clipboard")
                      : copyDataToClipBoard(didUrlInfo.text, "DID URL copied to clipboard")
                  }
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{didUrlInfo.href ? "Open this asset" : "DID URL"}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
