"use client";

import { Building2, Check, ChevronDown, EllipsisVertical }from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTrigger }from "./ui/dialog";
import { useMemo, useState } from "react";
import { Venue, getAssetIdFromVenueId } from "@covia/covia-sdk";
import type { AssetListItem } from "@covia/covia-sdk";
import { getVenueFor, useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenueRead } from "@/hooks/use-venue-read";
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
import type { VenueDescriptor } from "@/hooks/use-venues";

const NO_ASSETS: AssetListItem[] = [];

export const AssetLookup = ({sendAssetIdBackToForm}: {sendAssetIdBackToForm: (id: string) => void}) => {

  const venue = useAuthenticatedVenue();
  const getAuthForVenue = useAuthStore((state) => state.getAuthForVenue);

  const [assetId, setAssetId] =  useState("");
  const [filterValue, setFilterValue] =  useState("");
  // A venue picked in the dialog is remembered against the signed-in venue it
  // was picked instead of, so a change of the signed-in venue falls back to
  // the new one rather than keeping a stale choice.
  const [pick, setPick] = useState<{ insteadOf: Venue | null; venue: Venue } | null>(null);
  const selectedVenue = pick && pick.insteadOf === venue ? pick.venue : venue;
  const [open, setOpen] = useState(false);
  const { venues } = useVenues();

  // Fetch only while the dialog is actually open — this component is mounted
  // inside forms, and previously hydrated the venue's entire asset store on
  // mount even if the picker was never used. expand: 'metadata' inlines every
  // item's metadata into the one listing call, so there's no per-id pass. A
  // listing that fails leaves the picker empty; the form around it is unaffected.
  const { data: assetsMetadata } = useVenueRead<AssetListItem[]>({
    venue: selectedVenue,
    enabled: open,
    initial: NO_ASSETS,
    failureTitle: "Unable to list assets",
    notify: false,
    load: async (target) => (await target.listAssets({ expand: "metadata" })).items,
  });

  const setSelectedAsset = (assetId:string) => {
    setAssetId(assetId)

  }
  const filteredAsset = useMemo(() => {
    if (filterValue.length === 0) return assetsMetadata;
    const needle = filterValue.toLowerCase();
    return assetsMetadata.filter((asset) =>
      asset.id.indexOf(filterValue) != -1 || (asset.metadata.name ?? "").toLowerCase().indexOf(needle) != -1
    );
  }, [assetsMetadata, filterValue]);

  const handleVenueSelect = (descriptor: VenueDescriptor) => {
    setPick({ insteadOf: venue, venue: getVenueFor(descriptor, getAuthForVenue(descriptor.venueId)) });
  };
  return (
     <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>

      <EllipsisVertical className=" bg-muted text-muted-foreground rounded-md shadow-md p-1 h-8 "/>
      </DialogTrigger>
      <DialogContent className="h-11/12 w-11/12 space-y-0 bg-card text-card-foreground">

          <DialogHeader>Choose an asset</DialogHeader>
          <div className="flex flex-row w-full space-x-2">
            <Input
                        placeholder="Type keyword to search..."
                        className="w-80 bg-card text-card-foreground"
                        value={filterValue}
                        onChange={ (e) =>setFilterValue(e.target.value)}/>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" >
                    <Building2 size={14} />
                      {selectedVenue?.metadata.name}
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                    {venues.map((venue) => (
                      <DropdownMenuItem
                        key={venue.venueId}
                        onClick={() => handleVenueSelect(venue)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 size={16} />
                          <span className="truncate">{venue.metadata.name}</span>
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
                    filteredAsset && filteredAsset.map((asset: AssetListItem) =>


                        asset.id != assetId ?
                        ( <div  onClick={() => setSelectedAsset(asset.id)} data-testid="asset-lookup-item"
                        className="flex flex-col items-start justify-center  text-xs text-left  hover:bg-muted rounded-md my-4"  key={asset.id}>
                          <span className="px-2 rounded-sm text-[1rem] font-medium">{asset.metadata.name || "Unamed asset"}</span>
                          <span className="px-2 rounded-sm text-xs text-card-foreground my-1">{asset.id.substring(0,50)+".."}</span>
                        </div>)
                        :
                        (
                        <div  onClick={() => setSelectedAsset("")} data-testid="asset-lookup-item"
                        className="flex flex-col items-start justify-center  text-xs text-left bg-secondary-vlight  rounded-md my-4"  key={asset.id}>
                          <span className="px-2 rounded-sm text-[1rem] font-medium">{asset.metadata.name || "Unamed asset"}</span>
                          <span className="px-2 rounded-sm text-xs text-card-foreground my-1">{asset.id.substring(0,50)+".."}</span>
                       </div>
                        )
                      )



                  }
            </ScrollArea>


             <DialogClose asChild><Button onClick={(_e) => sendAssetIdBackToForm(getAssetIdFromVenueId(assetId!,selectedVenue?.venueId ?? ""))}>Select</Button></DialogClose>
      </DialogContent>

     </Dialog>
  );
};
