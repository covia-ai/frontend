"use client";

import { Building, Building2, Check, ChevronDown, EllipsisVertical } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "./ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset, Venue,getAssetIdFromVenueId } from "@covia-ai/covialib";
import { ScrollArea } from "./ui/scroll-area";
import { DialogClose } from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVenues } from "@/hooks/use-venues";

export const AssetLookup = ({sendAssetIdBackToForm}) => {
 
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const venue = useMemo(() => {
    // Your expensive calculation or value creation
    return new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.name})
    }, [venueObj]); // Dependency array

  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [filteredAsset, setFilteredAsset] = useState<Asset[]>([]);
  const [assetId, setAssetId] =  useState("");
  const [filterValue, setFilterValue] =  useState("");
  const [selectedVenue, setSelectedVenue]=  useState<Venue>();
  const { venues } = useVenues();

   useEffect( () => {
     setSelectedVenue(venue)
  },[venue]);

  useEffect( () => {
      setAssetsMetadata([]);
      selectedVenue?.getAssets().then((assets) => {
          setAssetsMetadata(assets);
          setFilteredAsset(assets)
      })
  },[selectedVenue]);

  const setSelectedAsset = (assetId:string) => {
    setAssetId(assetId)

  }
  useEffect(() => {
    if(filterValue.length > 0 ) {
        setFilteredAsset([])
        assetsMetadata.map((asset) => {
          
          if(asset.id.indexOf(filterValue) != -1 || asset.metadata.name?.toLowerCase().indexOf(filterValue.toLowerCase()) != -1) {
            setFilteredAsset(prevArray => [...prevArray,asset]);
          }
      
    })
   
  }
   else {
      setFilteredAsset(assetsMetadata)
    }
  },[filterValue, assetsMetadata])

  const handleVenueSelect = (venue: Venue) => {
    console.log(venue)
    setSelectedVenue(new Venue({baseUrl: venue.baseUrl, venueId: venue.venueId, name:venue.name}));
  };
  return (
     <Dialog>
      <DialogTrigger>
      
      <EllipsisVertical className=" bg-muted text-muted-foreground rounded-md shadow-md p-1 h-8 "/>
      </DialogTrigger>
      <DialogContent className="h-11/12 w-11/12 space-y-0">
          
          <DialogHeader>Choose an asset</DialogHeader>
          <div className="flex flex-row w-full space-x-2">
            <Input
                        placeholder="Type keyword to search..."
                        className="w-80 bg-card text-card-foreground"
                        value={filterValue}
                        onChange={ (e) =>setFilterValue(e.target.value)}/>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Building2 size={14} />
                      {selectedVenue?.name}
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                    {venues.map((venue:Venue) => (
                      <DropdownMenuItem
                        key={venue.venueId}
                        onClick={() => handleVenueSelect(venue)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 size={16} />
                          <span className="truncate">{venue.name}</span>
                        </div>
                      
                        {selectedVenue?.venueId === venue.venueId && (
                                      <Check size={16} className="text-primary" />
                                    )}
                        
                      </DropdownMenuItem>
                    ))}
              </DropdownMenuContent>
            </DropdownMenu>            
            </div>
            <ScrollArea className="h-96 w-112 border border-muted rounded-md p-2">
              
                
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
         

             <DialogClose><Button onClick={(e) => sendAssetIdBackToForm(getAssetIdFromVenueId(assetId!,selectedVenue?.venueId))}>Select</Button></DialogClose>
      </DialogContent>
      
     </Dialog>
  );
};
