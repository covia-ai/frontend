import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useVenues } from "@/hooks/use-venues";
import { Iconbutton } from "./Iconbutton";
import { Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { gtmEvent, normalizeVenueInput } from "@/lib/utils";

export const AddNewVenueModal = (props:any) => {
    const [open, setOpen] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const { addVenue,venues } = useVenues();
    const authData = useAuthStore((x) => x.auth);
    const [venueDidOrUrl, setVenueDidOrUrl] = useState("");

    const addVenueToList = async () => {
      const input = venueDidOrUrl.trim();
      if (!input) return;
      gtmEvent.buttonClick('Add Venue', input);

      // Normalise the free-text input into an ordered list of targets to try
      // (handles bare host / IP / host:port, picks http vs https — see utils).
      const candidates = normalizeVenueInput(input);

      setConnecting(true);
      let connected = null;
      let lastError: unknown = null;
      for (const candidate of candidates) {
        try {
          connected = await Venue.connect(candidate, createAuthProvider(authData));
          break;
        } catch (err) {
          lastError = err;
        }
      }
      setConnecting(false);

      if (!connected) {
        console.error("Venue connect failed", lastError);
        toast(`Could not connect to "${input}". Check the URL/DID and that the venue is reachable.`);
        return;
      }

      // Dedup on the venue's actual id (DID), so equivalent inputs collapse.
      if (venues.some((venue) => venue.venueId === connected!.venueId)) {
        toast("This venue is already connected.");
        return;
      }

      addVenue(connected);
      setVenueDidOrUrl("");
      setOpen(false);
    }

    return (
       <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                  <Iconbutton icon={PlusCircledIcon} message="Connect to new venue" label="Connect to venue"/> 
            </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground">
                <DialogTitle data-testid="add-title" className="flex flex-row items-center space-x-2">
                      Connect to a venue
              </DialogTitle>
                    
                    <div className="flex flex-col items-center justify-between space-y-4">
                      <div className="flex flex-row items-center justify-center space-x-2 w-full">
                      <Label  className="w-32">Venue Url/DID</Label>
                      <Input data-testid="venue-urlid" required onChange={e => setVenueDidOrUrl(e.target.value)} placeholder="Provide venue Url/DID"></Input>
                    </div>
                   
                  </div>
                      <Button data-testid="venue-addbtn" aria-label="connect" role="button" disabled={connecting} onClick={() => addVenueToList()}>{connecting ? "Connecting…" : "Connect"}</Button>
            </DialogContent>
       </Dialog>
    )
}