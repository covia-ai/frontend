import { Card } from "@/components/ui/card";
import { Iconbutton } from "./Iconbutton";
import { Badge, CopyIcon, InfoIcon, Save, SquareArrowOutUpRight } from "lucide-react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, DataAsset, Venue } from "@/lib/covia";
import { useRouter } from "next/navigation";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
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

interface AssetCardProps {
  asset: Asset;
  type: string;
  venueSlug:string
}

export function AssetCard({ asset,type,venueSlug }: AssetCardProps) {
    const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
    if (!venueObj) return null;
    const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name})
    const router = useRouter();
    const [newJsonData, setNewJsonData] = useState({});
    
    function renderJSONMap(jsonObject: JSON, requiredKeys: string[] = []) {
        const keys = Object.keys(jsonObject);
        const type = new Array<string>();
        const description = new Array<string>();
        keys.map((key, index) => {
          const jsonValue = jsonObject[key];
          type[index] = jsonValue.type;
          description[index] = jsonValue.description;
        });
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-white">
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key, index) => (
                <TableRow key={index}>
                  <TableCell>{key} {requiredKeys != undefined && requiredKeys?.indexOf(key) != -1 && <span className="text-red-400">*</span>}</TableCell>
                  <TableCell>{type[index]}</TableCell>
                  <TableCell>{description[index]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
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
              fetchAssets();
            }
          })
        }
        catch (error) {
          setAssetCreated(false);
        }
    }
    return (
         <Card key={asset.id} className="shadow-md border-2 h-full bg-slate-100 flex flex-col rounded-md hover:border-accent hover:border-2 h-48">
                {/* Fixed-size header */}
                <div className="h-14 p-2 flex flex-row items-center border-b bg-slate-50">
                    <div className="truncate flex-1 mr-2 font-semibold text-sm"
                    onClick={() => handleCardClick(asset.id)}>{asset.metadata.name || 'Unnamed Asset'}
                    </div>
                    {type == "operations" && 
                       <Sheet>
                           <SheetTrigger>
                              <Iconbutton icon={InfoIcon} message="Know more"></Iconbutton>
                           </SheetTrigger>
                            <SheetContent className="min-w-lg">
                                <SheetHeader className="flex flex-col items-center justify-center">
                                <SheetTitle>{asset.metadata.name}</SheetTitle>
                                {asset.metadata.description && <SheetDescription>
                                    {asset.metadata.description}
                                </SheetDescription>}
                                </SheetHeader>
                                {asset.metadata.operation?.input?.properties && (
                                <div className="flex flex-center flex-col mx-4">
                                    <div className="p-2">Inputs</div>
                                    <Separator />
                                    <div className="grid grid-cols-1">{asset.metadata.operation?.input?.properties &&
                                    renderJSONMap(asset.metadata.operation?.input?.properties, asset.metadata.operation?.input?.required)
                                    }
                                    </div>
                                </div>
                                )}
                                {asset.metadata.operation?.output?.properties && (
                                <div className="flex flex-center flex-col mx-4">
                                    <div className="p-2">Outputs</div>
                                    <Separator />
                                    <div className="grid grid-cols-1">{asset.metadata.operation?.output?.properties &&
                                    renderJSONMap(asset.metadata.operation?.output?.properties)
                                    }
                                    </div>
                                </div>
                                )}
                                <SheetFooter>
                                <SheetClose asChild>
                                    {asset.id && asset.metadata?.operation?.input && <Button type="submit" onClick={() => { handleCardClick(asset.id) }}>Run</Button>}
                                </SheetClose>
                                </SheetFooter>
                            </SheetContent>
                       </Sheet>  
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
                                    <Button type="button" onClick={() => copyAsset(newJsonData)}> <Save></Save></Button>
                                }
                                {JSON.stringify(newJsonData) == "{}" &&
                                    <Button type="button" disabled><Save></Save></Button>
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
                <div className="flex-1 p-2 flex flex-col justify-between" onClick={() => handleCardClick(asset.id)}>
                    <div className="text-xs text-slate-600 line-clamp-3 mb-2">{asset.metadata.description || 'No description available'}</div>
                </div>

                {/* Fixed-size footer */}
                <div className="p-2 h-12 flex flex-row-reverse items-center justify-between" onClick={() => handleCardClick(asset.id)}>
                    <Iconbutton icon={SquareArrowOutUpRight} message="View Asset" path={type} pathId={asset.id}/>
                    
                </div>
        </Card>
    )
}