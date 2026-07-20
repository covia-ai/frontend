import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useVenues } from "@/hooks/use-venues";
import { Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { gtmEvent } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const AddNewVenueModal = (_props:any) => {
    const [open, setOpen] = useState(false)
    const { addVenue, venues } = useVenues();
    const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
    const [venueDidOrUrl, setVenueDidOrUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const addVenueToList = async () => {
      let processVenueDidOrUrl = venueDidOrUrl.trim();
      if (!processVenueDidOrUrl) return;
      gtmEvent.buttonClick('Add Venue', processVenueDidOrUrl);

      if (processVenueDidOrUrl.endsWith("/"))
        processVenueDidOrUrl = processVenueDidOrUrl.slice(0, -1);

      const alreadyConnected = venues.some((v) =>
        v.venueId === processVenueDidOrUrl ||
        ((processVenueDidOrUrl.startsWith('http:') || processVenueDidOrUrl.startsWith('https:')) &&
          v.baseUrl.includes(processVenueDidOrUrl))
      );

      if (alreadyConnected) {
        setError("This venue is already connected.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const authOption = createAuthProvider(getAuthForVenue(processVenueDidOrUrl));
        const venue = await Venue.connect(processVenueDidOrUrl, authOption);
        addVenue(venue);
        toast("Venue connected successfully");
        setVenueDidOrUrl("");
        setOpen(false);
      } catch {
        setError("Could not connect to venue. Check the URL or DID and try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
       <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setError(""); setVenueDidOrUrl(""); } }}>
            <DialogTrigger asChild>
                  <Button data-testid="connect-venue-trigger" className="shrink-0 gap-2">
                        <PlusCircledIcon />
                        Connect Venue
                  </Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground">
                <DialogTitle data-testid="add-title" className="flex flex-row items-center space-x-2">
                      Connect to a venue
              </DialogTitle>

                    <div className="flex flex-col items-center justify-between space-y-4">
                      <div className="flex flex-row items-center justify-center space-x-2 w-full">
                        <Label className="w-32">Venue Url/DID</Label>
                        <Input
                          data-testid="venue-urlid"
                          required
                          value={venueDidOrUrl}
                          onChange={e => { setVenueDidOrUrl(e.target.value); setError(""); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) addVenueToList(); }}
                          placeholder="Provide venue Url/DID"
                          disabled={loading}
                        />
                      </div>
                      {error && <p className="text-sm text-destructive w-full">{error}</p>}
                      <div className="flex w-full justify-end">
                        <Button
                          data-testid="venue-addbtn"
                          aria-label="connect"
                          role="button"
                          onClick={addVenueToList}
                          disabled={loading || !venueDidOrUrl.trim()}
                        >
                          {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                          {loading ? "Connecting…" : "Connect"}
                        </Button>
                      </div>
                  </div>
            </DialogContent>
       </Dialog>
    )
}
