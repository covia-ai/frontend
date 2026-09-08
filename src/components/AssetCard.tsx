import { Card } from "@/components/ui/card";
import { Asset, Venue, assetHash } from "@covia/covia-sdk";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { AssetInfoSheet } from "./AssetInfoSheet";
import { Pin } from "lucide-react";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AssetCardProps {
  asset: Asset;
  type: string;
  compact:boolean;
  venue?: Venue;
  // False when rendered outside a /venues/[slug] route (e.g. the unscoped
  // /publicartifacts or /operations lists) — clicks then go to a venue-less
  // route instead of /venues/{venueId}/{type}/{id}. Defaults true so every
  // other caller keeps today's venue-scoped links.
  scoped?: boolean;
}

export function AssetCard({ asset,type,compact,venue: venueProp,scoped = true }: AssetCardProps) {
    const fallbackVenue = useAuthenticatedVenue();
    const venue = venueProp ?? fallbackVenue;
    const router = useRouter();

    const pinned = usePinnedAssets((s) => (venue ? s.isPinned(venue.venueId, asset.id) : false));
    const togglePin = usePinnedAssets((s) => s.togglePin);
    const handlePinToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!venue) return;
      togglePin(venue.venueId, asset.id);
    };

    const adapter = (asset.metadata?.operation?.adapter as string | undefined)?.split(':')[0] ?? null;

    const keywords: string[] = Array.isArray(asset.metadata?.keywords) ? asset.metadata.keywords : [];
    const maxKeywords = compact ? 2 : 4;
    const visibleKeywords = keywords.slice(0, maxKeywords);
    const hiddenKeywordCount = keywords.length - visibleKeywords.length;


    const handleCardClick = (assetId:string) => {
        if (!scoped) {
          if (type === "assets") {
            // Assets are content-hashed, so a bare hex hash alone (plus
            // whichever venue is selected) is enough to resolve one — see
            // PublicArtifactViewer. Non-hash ids (rare) fall through to the
            // venue-scoped link below.
            const hash = assetHash(assetId);
            if (hash) {
              router.push("/publicartifact/"+encodeURIComponent(hash));
              return;
            }
          } else if (type === "operations") {
            // Operations are catalog-path addressed (e.g. "v/ops/a2a/agent-
            // card"), not content-hashed, so the full path — not a hash —
            // is what a venue-less lookup needs. See PublicOperationViewer.
            router.push("/operation/"+assetId);
            return;
          }
        }
        if (!venue) return;
        const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId)+"/"+type+"/"+assetId;
        router.push(encodedUrl);
    };
    return (
         <Card key={asset.id} className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md hover:border-accent hover:border-2
          ${ pinned ? 'border-primary' : 'border-muted' }
          ${ compact ? 'h-32 p-1' : 'h-48 p-2' }`}>
                {/* Fixed-size header */}
                <div className={` ${ compact ? 'h-10' : 'h-14' } p-2 flex flex-row items-center gap-1 border-b bg-card-banner`}>
                    <div data-testid = "asset-header" className="truncate flex-1 mr-2 text-md text-foreground"
                    onClick={() => handleCardClick(asset.id)}>{asset.metadata.name || 'Unnamed Asset'}
                    </div>
                    {type === "assets" && venue && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            data-testid="asset-pin-toggle"
                            aria-label={pinned ? "Unpin asset" : "Pin asset"}
                            aria-pressed={pinned}
                            onClick={handlePinToggle}
                            className={`shrink-0 ${pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            <Pin size={16} className={pinned ? "fill-current" : undefined} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{pinned ? "Unpin" : "Pin for quick access"}</TooltipContent>
                      </Tooltip>
                    )}
                    {type == "operations" &&
                       <AssetInfoSheet asset={asset} venueId={venue?.venueId ?? ""}/>
                    }
                </div>

                {/* Flexible middle section */}
                <div className="flex-1 p-2 flex flex-col justify-between text-sm" onClick={() => handleCardClick(asset.id)}>
                    <div data-testid="asset-description" className={` ${ compact ? 'line-clamp-2' : 'line-clamp-3' } text-xs text-card-foreground `}>{asset.metadata.description || 'No description available'}</div>
                    {(type === "operations" && adapter) || keywords.length > 0 ? (
                      <div data-testid="asset-tags" className="flex flex-wrap items-center gap-1 mt-1">
                        {type === "operations" && adapter && (
                          <Badge variant="outline" className="w-fit font-mono text-[10px] px-1.5 py-0 text-muted-foreground">
                            {adapter}
                          </Badge>
                        )}
                        {keywords.length > 0 && (
                          <div data-testid="asset-keywords" className="flex flex-wrap items-center gap-1">
                            {visibleKeywords.map((keyword) => (
                              <Badge key={keyword} variant="secondary" className="w-fit text-[10px] px-1.5 py-0 text-secondary-foreground">
                                {keyword}
                              </Badge>
                            ))}
                            {hiddenKeywordCount > 0 && (
                              <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 text-muted-foreground">
                                +{hiddenKeywordCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}
                </div>


        </Card>
    )
}
