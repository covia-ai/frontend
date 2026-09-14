import { Card } from "@/components/ui/card";
import { Asset, Venue, assetHash, parseDidUrl } from "@covia/covia-sdk";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { AssetInfoSheet } from "./AssetInfoSheet";
import { DidDisplay } from "./DidDisplay";
import { TypeTile } from "./TypeTile";
import { Pin } from "lucide-react";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { assetKindLook, getAssetKind } from "@/lib/asset-kind";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

// The venue-scoped detail routes take the address *after* the venue DID, not
// the whole DID URL: listAssets() ids arrive fully qualified
// ("did:key:z6…/a/<hash>", see CoviaAPI.getAssets), and pushing one raw split
// into extra path segments that the single-segment assets/[id] route could
// never match — a 404 on every card click (frontend#382).
//
// assets/[id] is one segment, so an asset resolves to its bare hash (the same
// link AssetHeader generates); anything not hash-addressed is encoded whole to
// stay one segment. operations/[...id] is a catch-all taking a
// namespace-explicit address as separate segments ("v/ops/…", "a/<hash>"),
// each encoded individually — the shape AdaptersList and PolicyLinks build.
function scopedHref(venueId: string, type: string, assetId: string): string {
    const base = "/venues/" + encodeURIComponent(venueId) + "/" + type;
    const { namespace, path } = parseDidUrl(assetId);
    // Strip only the DID; a namespace-relative id ("v/ops/…") is already the
    // address. A bare DID has no namespace and nothing sensible to link to.
    const address = assetId.startsWith("did:")
        ? [namespace, path].filter(Boolean).join("/")
        : assetId;
    if (!address) return base;
    if (type !== "assets") {
        return base + "/" + address.split("/").map(encodeURIComponent).join("/");
    }
    return base + "/" + (assetHash(assetId) ?? encodeURIComponent(address));
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

    // Kind identity: the canonical glyph+tile for this asset's kind (W3), the
    // same mark the detail header wears.
    const kindLook = assetKindLook(getAssetKind(asset.metadata));
    // The asset's own mark + address: a content hash renders a hash-derived
    // identicon via DidDisplay; a catalogue-path id (operations) elides as text.
    const addressValue = assetHash(asset.id) ?? asset.id;

    // Provenance for scanning a catalogue: who made it and when. Both optional —
    // the footer is omitted when the asset carries neither.
    const creator = typeof asset.metadata?.creator === "string" ? asset.metadata.creator : null;
    const dateValue = (asset.metadata?.dateModified ?? asset.metadata?.dateCreated) as string | undefined;
    const dateLabel = dateValue ? formatDateTime(dateValue) : null;

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
        router.push(scopedHref(venue.venueId, type, assetId));
    };
    return (
         <Card
           key={asset.id}
           className={cn(
             "group flex h-full flex-col gap-2 rounded-xl border bg-card p-3 transition-colors hover:border-accent",
             pinned ? "border-primary" : "border-border",
           )}
         >
                {/* Identity row: kind tile + name/kind, with pin / info at the end */}
                <div className="flex items-start gap-2.5">
                    <TypeTile Icon={kindLook.Icon} tile={kindLook.tile} className="size-9" iconSize={18} title={kindLook.label} />
                    <div
                      data-testid="asset-header"
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleCardClick(asset.id)}
                    >
                        <div className="truncate text-sm font-semibold text-foreground">{asset.metadata.name || 'Unnamed Asset'}</div>
                        <div className="truncate text-xs text-muted-foreground">{kindLook.label}</div>
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

                {/* The asset's own mark + address (content hash → identicon) */}
                <div data-testid="asset-address" className="min-w-0 text-xs text-muted-foreground">
                    <DidDisplay value={addressValue} chars={8} iconSize={14} />
                </div>

                {/* Description */}
                <div
                  data-testid="asset-description"
                  className={cn(compact ? 'line-clamp-2' : 'line-clamp-3', "flex-1 cursor-pointer text-xs text-card-foreground")}
                  onClick={() => handleCardClick(asset.id)}
                >
                    {asset.metadata.description || 'No description available'}
                </div>

                {/* Adapter + keywords */}
                {(type === "operations" && adapter) || keywords.length > 0 ? (
                  <div data-testid="asset-tags" className="flex flex-wrap items-center gap-1">
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

                {/* Provenance: creator mark + date, for scanning a catalogue */}
                {(creator || dateLabel) && (
                  <div data-testid="asset-provenance" className="flex items-center gap-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    {creator ? (
                      <span className="min-w-0 flex-1"><DidDisplay value={creator} chars={6} iconSize={13} /></span>
                    ) : <span className="flex-1" />}
                    {dateLabel && (
                      <time className="shrink-0 whitespace-nowrap" title={dateLabel}>{dateLabel}</time>
                    )}
                  </div>
                )}
        </Card>
    )
}
