"use client";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Iconbutton } from "./Iconbutton";
import { InfoIcon } from "lucide-react";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Asset } from "@covia-ai/covialib";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

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
        const encodedUrl = "/venues/"+encodeURIComponent(venueId)+"/assets/"+assetId;
        router.push(encodedUrl);
    };

  return (
     <Sheet>
                <SheetTrigger>
                  <Iconbutton icon={InfoIcon} message="Know more"></Iconbutton>
                </SheetTrigger>
                  <SheetContent data-testid="info_sheet" className="min-w-lg text-card-foreground bg-card">
                      <SheetHeader className="flex flex-col items-center justify-center">
                      <SheetTitle data-testid="info_assetname">{asset.metadata.name}</SheetTitle>
                      {asset.metadata.description && <SheetDescription data-testid="info_assetdesc"
                      className="text-slate-400 text-center">
                          {asset.metadata.description}
                      </SheetDescription>}
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
                      <SheetFooter>
                      <SheetClose asChild>
                          {asset.id && asset.metadata?.operation?.input && 
                          <Button aria-label="run" role="button" data-testid="info_runbtn" type="submit" onClick={() => { handleCardClick(asset.id) }}>Run</Button>}
                      </SheetClose>
                      </SheetFooter>
                  </SheetContent>
    </Sheet>  
  );
};
