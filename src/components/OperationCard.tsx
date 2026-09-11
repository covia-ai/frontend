"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Asset, Venue } from "@covia/covia-sdk";
import { useRouter } from "next/navigation";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { AssetInfoSheet } from "./AssetInfoSheet";
import { ArrowUpRight, Workflow } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { adapterLook, adapterOfMetadata, OperationSignature } from "./operation-display";

interface OperationCardProps {
  asset: Asset;
  venue?: Venue;
  /** False outside a /venues/[slug] route — see AssetCard for the rationale. */
  scoped?: boolean;
}

// Memoised: the catalogue filters search client-side, so a keystroke
// re-renders OperationsList and remaps the visible page. The card's props
// (asset, venue, scoped) are stable across those renders, so `memo` keeps each
// card — and its per-render schema-signature parse — from re-running unless the
// card actually changes.
function OperationCardBase({ asset, venue: venueProp, scoped = true }: OperationCardProps) {
  const fallbackVenue = useAuthenticatedVenue();
  const venue = venueProp ?? fallbackVenue;
  const router = useRouter();

  const op = asset.metadata?.operation as any;
  const adapter = adapterOfMetadata(op);
  const { Icon, tile } = adapterLook(adapter);
  const stepCount = Array.isArray(op?.steps) ? op.steps.length : 0;

  const keywords: string[] = Array.isArray(asset.metadata?.keywords) ? asset.metadata.keywords : [];
  const visibleKeywords = keywords.slice(0, 4);
  const hiddenKeywordCount = keywords.length - visibleKeywords.length;

  // Preserve AssetCard's exact navigation: unscoped lists route to the
  // venue-less /operation/<path>, scoped lists to /venues/<id>/operations/<path>.
  const handleClick = () => {
    if (!scoped) {
      router.push("/operation/" + asset.id);
      return;
    }
    if (!venue) return;
    router.push("/venues/" + encodeURIComponent(venue.venueId) + "/operations/" + asset.id);
  };

  return (
    <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-lg border bg-card p-0 shadow-sm transition-all hover:border-accent hover:shadow-md">
      {/* Header: adapter identity + name + info sheet */}
      <div className="flex flex-row items-center gap-3 border-b bg-card-banner px-4 py-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tile}`}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <button
          type="button"
          data-testid="asset-header"
          onClick={handleClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-base font-semibold leading-tight text-foreground">
            {asset.metadata.name || "Unnamed Asset"}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{asset.id}</div>
        </button>
        {venue && <AssetInfoSheet asset={asset} venueId={venue.venueId} />}
      </div>

      {/* Body: description, signature, tags */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <div
          data-testid="asset-description"
          className="line-clamp-2 cursor-pointer text-sm text-card-foreground"
          onClick={handleClick}
        >
          {asset.metadata.description || "No description available"}
        </div>

        <OperationSignature operation={op} max={4} />

        <div className="mt-auto flex items-center gap-2 pt-1">
          <div data-testid="asset-tags" className="flex flex-1 flex-wrap items-center gap-1">
            {adapter && (
              <Badge
                variant="outline"
                className="w-fit px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
              >
                {adapter}
              </Badge>
            )}
            {stepCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex w-fit items-center gap-1 border-chart-4/40 px-1.5 py-0 text-[10px] text-chart-4"
                  >
                    <Workflow size={10} /> {stepCount} steps
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Composite operation — {stepCount} steps</TooltipContent>
              </Tooltip>
            )}
            {visibleKeywords.length > 0 && (
              <div data-testid="asset-keywords" className="flex flex-wrap items-center gap-1">
                {visibleKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="w-fit px-1.5 py-0 text-[10px] text-secondary-foreground"
                  >
                    {keyword}
                  </Badge>
                ))}
                {hiddenKeywordCount > 0 && (
                  <Badge
                    variant="outline"
                    className="w-fit px-1.5 py-0 text-[10px] text-muted-foreground"
                  >
                    +{hiddenKeywordCount}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            data-testid="operation-open"
            onClick={handleClick}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            Open <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </Card>
  );
}

export const OperationCard = memo(OperationCardBase);
