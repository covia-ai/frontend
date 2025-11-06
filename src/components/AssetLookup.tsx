"use client";

import { EllipsisVertical } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "./ui/dialog";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, Venue } from "@/lib/covia";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { DialogClose } from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";


export const AssetLookup = ({sendAssetIdBackToForm}) => {
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name})
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [filteredAsset, setFilteredAsset] = useState<Asset[]>([]);
  const [assetId, setAssetId] =  useState();
  const [filterValue, setFilterValue] =  useState("");
  function fetchAssets() {
      setAssetsMetadata([]);
      venue.getAssets().then((assets) => {
          setAssetsMetadata(assets);
          setFilteredAsset(assets)
      })
    }

  useEffect( () => {
      fetchAssets();
  },[]);

  const setSelectedAsset = (assetId:string) => {
    setAssetId(assetId)

  }
  useEffect(() => {
    if(filterValue.length > 0 ) {
        setFilteredAsset([])
        assetsMetadata.map((asset) => {
          
          if(asset.id.indexOf(filterValue) != -1 || asset.metadata.name?.toLowerCase().indexOf(filterValue) != -1) {
            setFilteredAsset(prevArray => [...prevArray,asset]);
          }
      
    })
   
  }
   else {
      setFilteredAsset(assetsMetadata)
    }
  },[filterValue, assetsMetadata])
  return (
     <Dialog>
      <DialogTrigger>
      
      <EllipsisVertical className=" bg-muted text-muted-foreground rounded-md shadow-md p-1 h-8"/>
      </DialogTrigger>
      <DialogContent className="h-11/12 w-11/12">
          <DialogHeader>Choose an asset  {filterValue}</DialogHeader>
          <Input
                        placeholder="Type keyword to search..."
                        className="w-112 bg-card text-card-foreground mb-2"
                        value={filterValue}
                        onChange={ (e) =>setFilterValue(e.target.value)}/>
            <ScrollArea className="h-100 w-112 border border-muted rounded-md p-2">
              
                
                  {
                    filteredAsset && filteredAsset.map((asset:Asset, index:number) => 
                       
                       
                        asset.id != assetId ? 
                        ( <div  onClick={() => setSelectedAsset(asset.id)}  
                        className="flex flex-col items-start justify-center  text-xs text-left  hover:bg-muted rounded-md my-4"  key={index}>
                          <span className="px-2 rounded-sm text-[1rem] font-medium">{asset.metadata.name || "Unamed asset"}</span>
                          <span className="px-2 rounded-sm text-xs text-card-foreground my-1">{asset.id.substring(0,50)+".."}</span>
                        </div>)
                        :
                        (
                        <div  onClick={() => setSelectedAsset("")}  
                        className="flex flex-col items-start justify-center  text-xs text-left bg-secondary-vlight  rounded-md my-4"  key={index}>
                          <span className="px-2 rounded-sm text-[1rem] font-medium">{asset.metadata.name || "Unamed asset"}</span>
                          <span className="px-2 rounded-sm text-xs text-card-foreground my-1">{asset.id.substring(0,50)+".."}</span>                        
                       </div>
                        )
                      )


                    
                  }
            </ScrollArea>
             <DialogClose><Button onClick={(e) => sendAssetIdBackToForm(assetId)}>Select</Button></DialogClose>
      </DialogContent>
     </Dialog>
  );
};
