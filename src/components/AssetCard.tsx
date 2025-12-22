import { Card } from "@/components/ui/card";
import { Iconbutton } from "./Iconbutton";
import {  CopyIcon,  Save, SquareArrowOutUpRight } from "lucide-react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, Venue } from "@covia-ai/covialib";
import { useRouter } from "next/navigation";
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

interface AssetCardProps {
  asset: Asset;
  type: string;
}

export function AssetCard({ asset,type }: AssetCardProps) {
    const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());


    const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.name})
    const router = useRouter();
    const [newJsonData, setNewJsonData] = useState({});
    const [assetCreated, setAssetCreated] = useState(false);

    
    const handleCardClick = (assetId:string) => {
        const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId)+"/"+type+"/"+assetId;
        router.push(encodedUrl);
    };
    function copyAsset(jsonData: JSON) {
        try {
          venue?.createAsset(jsonData).then((asset: Asset) => {
            if (asset != undefined && asset != null) {
              setNewJsonData({})
              setAssetCreated(true);
              window.location.reload()
            }
          })
        }
        catch (error) {
          setAssetCreated(false);
        }
    }
    return (
         <Card key={asset.id} className="shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2 h-48">
                {/* Fixed-size header */}
                <div className="h-14 p-2 flex flex-row items-center border-b bg-card-banner">
                    <div data-testid = "asset-header" className="truncate flex-1 mr-2 text-md text-foreground"
                    onClick={() => handleCardClick(asset.id)}>{asset.metadata.name || 'Unnamed Asset'}
                    </div>
                    {type == "operations" && 
                       <AssetInfoSheet asset={asset} venueId={venue?.venueId}/> 
                    }
                    {type == "assets" && 
                        <Dialog>
                            <DialogTrigger>
                            <Iconbutton icon={CopyIcon} message="Copy Asset"/>
                            
                            </DialogTrigger>
                            <DialogContent className="h-11/12 min-w-10/12 ">
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
                            </DialogContent>
                        </Dialog>
                    }
                </div>

                {/* Flexible middle section */}
                <div className="flex-1 p-2 flex flex-col justify-between text-sm" onClick={() => handleCardClick(asset.id)}>
                    <div data-testid="asset-description" className="text-xs text-card-foreground line-clamp-3 mb-2">{asset.metadata.description || 'No description available'}</div>
                </div>

                {/* Fixed-size footer */}
                <div className="p-2 h-12 flex flex-row-reverse items-center justify-between" onClick={() => handleCardClick(asset.id)}>
                    <Iconbutton icon={SquareArrowOutUpRight} message="View Asset" path={type} pathId={asset.id} venueId={venue.venueId}/>
                    
                </div>
        </Card>
    )
}