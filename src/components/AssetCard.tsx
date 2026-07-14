import { Card } from "@/components/ui/card";
import { Copy, Save }from "lucide-react";
import { Asset } from "@covia/covia-sdk";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react";
import { JsonEditor } from "json-edit-react";
import { AssetInfoSheet } from "./AssetInfoSheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AssetCardProps {
  asset: Asset;
  type: string;
  compact:boolean;
}

export function AssetCard({ asset,type,compact }: AssetCardProps) {
    const venue = useAuthenticatedVenue();
    const router = useRouter();
    const [newJsonData, setNewJsonData] = useState<any>({});

    const adapter = (asset.metadata?.operation?.adapter as string | undefined)?.split(':')[0] ?? null;

    const keywords: string[] = Array.isArray(asset.metadata?.keywords) ? asset.metadata.keywords : [];
    const maxKeywords = compact ? 2 : 4;
    const visibleKeywords = keywords.slice(0, maxKeywords);
    const hiddenKeywordCount = keywords.length - visibleKeywords.length;


    const handleCardClick = (assetId:string) => {
        if (!venue) return;
        const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId)+"/"+type+"/"+assetId;
        router.push(encodedUrl);
    };
    function copyAsset(jsonData: JSON) {
        try {
          venue?.assets.register(jsonData).then((asset: Asset) => {
            if (asset != undefined && asset != null) {
              setNewJsonData({})
              window.location.reload()
            }
          })
        }
        catch (error) {
          console.error('Error copying asset:', error);
        }
    }
    return (
         <Card key={asset.id} className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2 
          ${ compact ? 'h-32 p-1' : 'h-48 p-2' }`}>
                {/* Fixed-size header */}
                <div className={` ${ compact ? 'h-10' : 'h-14' } p-2 flex flex-row items-center border-b bg-card-banner`}>
                    <div data-testid = "asset-header" className="truncate flex-1 mr-2 text-md text-foreground"
                    onClick={() => handleCardClick(asset.id)}>{asset.metadata.name || 'Unnamed Asset'}
                    </div>
                    {type == "operations" && 
                       <AssetInfoSheet asset={asset} venueId={venue?.venueId ?? ""}/> 
                    }
                    {type == "assets" && 
                        <Dialog>
                            <DialogTrigger>
                            <Tooltip>
                            <TooltipTrigger>
                                 <Copy size={16} data-testid="copy_btn"/>
                            </TooltipTrigger>
                            <TooltipContent data-testid="btn-tootip">Copy Asset</TooltipContent>
                             </Tooltip>
                            </DialogTrigger>
                            <DialogContent className="h-11/12 min-w-10/12 bg-card text-card-foreground content-start">
                            <DialogTitle className="flex flex-row items-center justify-between mr-4">
                                Copy asset
                                <DialogClose>
                                {JSON.stringify(newJsonData) != "{}" &&
                                    <Button aria-label="save" role="button" type="button" onClick={() => copyAsset(newJsonData)}> <Save></Save></Button>
                                }
                                {JSON.stringify(newJsonData) == "{}" &&
                                    <Button aria-label="save" role="button" type="button" disabled><Save></Save></Button>
                                }

                                </DialogClose>
                            </DialogTitle>
                            <div className="rounded-lg bg-white">
                            {Object.keys(newJsonData).length == 0 && <JsonEditor data={asset.metadata}
                                setData={setNewJsonData}
                                rootName="metadata"
                                rootFontSize="1em"
                                collapse={1}
                                maxWidth="90vw"
                            />}
                            {Object.keys(newJsonData).length > 0 && <JsonEditor data={newJsonData}
                                setData={setNewJsonData}
                                rootName="metadata"
                                rootFontSize="1em"
                                collapse={1}
                                maxWidth="90vw"
                            />}
                            <p className="px-8 pb-4 text-xs italic text-neutral-500">
                                Editing any field above creates a copy — click the save icon to register it as a brand-new asset. The original is left untouched.
                            </p>
                            </div>
                            </DialogContent>
                        </Dialog>
                    }
                </div>

                {/* Flexible middle section */}
                <div className="flex-1 p-2 flex flex-col justify-between text-sm" onClick={() => handleCardClick(asset.id)}>
                    <div data-testid="asset-description" className={` ${ compact ? 'line-clamp-2' : 'line-clamp-3' } text-xs text-card-foreground `}>{asset.metadata.description || 'No description available'}</div>
                    {(type === "operations" && adapter) || keywords.length > 0 ? (
                      <div data-testid="asset-tags" className="flex flex-wrap items-center gap-1 mt-1">
                        {type === "operations" && adapter && (
                          <Badge variant="default" className="w-fit text-[10px] px-1.5 py-0">
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