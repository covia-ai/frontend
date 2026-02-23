"use client";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Iconbutton } from "./Iconbutton";
import { Info, InfoIcon } from "lucide-react";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Asset } from "@covia/covia-sdk";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AssetInfoSheetProps {
  asset: Asset;
  venueId:string;
}

export const AssetInfoSheet = ({asset,venueId}:AssetInfoSheetProps) => {
  const router = useRouter();

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
           
            <TableBody>
              {keys.map((key, index) => (
                <TableRow key={index}>
                  <TableCell>{key} {requiredKeys != undefined && requiredKeys?.indexOf(key) != -1 && <span className="text-red-400">*</span>}</TableCell>
                  <TableCell>{description[index]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
  }
   const handleCardClick = (assetId:string) => {
        const encodedUrl = "/venues/"+encodeURIComponent(venueId)+"/assets/"+assetId;
        router.push(encodedUrl);
    };

  return (
     <Sheet>
                <SheetTrigger>
                  <Tooltip>
                            <TooltipTrigger>
                                 <Info size={16} data-testid="info_btn"/>
                            </TooltipTrigger>
                            <TooltipContent data-testid="btn-tootip">Know More</TooltipContent>
                             </Tooltip>
                </SheetTrigger>
                  <SheetContent data-testid="info_sheet" className="min-w-2xl text-card-foreground bg-card">
                      <SheetHeader className="flex flex-col items-center justify-center">
                      <SheetTitle data-testid="info_assetname">{asset.metadata.name}</SheetTitle>
                     
                      </SheetHeader>
                      {asset.metadata.operation?.input?.properties && (
                      <div className="flex flex-center flex-col mx-4" >
                          <div className="p-2">Inputs</div>
                          <Separator />
                          <div className="grid grid-cols-1" data-testid="info_assetinputs">{asset.metadata.operation?.input?.properties &&
                          renderJSONMap(asset.metadata.operation?.input?.properties, asset.metadata.operation?.input?.required)
                          }
                          </div>
                      </div>
                      )}
                      {asset.metadata.operation?.output?.properties && (
                      <div className="flex flex-center flex-col mx-4" data-testid="info_assetoutputs">
                          <div className="p-2">Outputs</div>
                          <Separator />
                          <div className="grid grid-cols-1">{asset.metadata.operation?.output?.properties &&
                          renderJSONMap(asset.metadata.operation?.output?.properties)
                          }
                          </div>
                      </div>
                      )}
                      
                  </SheetContent>
    </Sheet>  
  );
};
