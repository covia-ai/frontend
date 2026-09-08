import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useVenues } from "@/hooks/use-venues";
import { connectVenue } from "@/lib/venue-registry";
import { notifySuccess } from "@/lib/notify";
import { useAuthStore } from "@/hooks/use-auth";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Label } from "@/components/ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { gtmEvent } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const PRIVATE_HOST_RE = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?|.*\.local)$/i;

/** Whether `value` names a loopback/private-network host — Chrome's Private
 *  Network Access can silently block an https page from reaching one, with
 *  no CORS error, just a failed fetch (frontend#166). */
export function isPrivateNetworkTarget(value: string): boolean {
  let host: string;
  try {
    host = value.includes("://") ? new URL(value).hostname : value.split(/[/:]/)[0];
  } catch {
    return false;
  }
  return PRIVATE_HOST_RE.test(host);
}

export const AddNewVenueModal = () => {
    const [open, setOpen] = useState(false)
    const { addVenue, venues } = useVenues();
    const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
    const [venueDidOrUrl, setVenueDidOrUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const addVenueToList = async () => {
      let processVenueDidOrUrl = venueDidOrUrl.trim();
      if (!processVenueDidOrUrl) return;

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
        const venue = await connectVenue(
          processVenueDidOrUrl,
          getAuthForVenue(processVenueDidOrUrl),
          10_000,
        );
        addVenue(venue);
        gtmEvent.connectVenue(venue.venueId);
        notifySuccess("Venue connected successfully");
        setVenueDidOrUrl("");
        setOpen(false);
      } catch {
        gtmEvent.connectVenueFailed(processVenueDidOrUrl);
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
                <DialogDescription>
                  Connect using a venue URL or decentralized identifier.
                </DialogDescription>

                    <div className="flex flex-col items-center justify-between space-y-4">
                      <div className="flex flex-row items-center justify-center space-x-2 w-full">
                        <Label htmlFor="venue-urlid" className="w-32">Venue URL/DID</Label>
                        <Input
                          id="venue-urlid"
                          data-testid="venue-urlid"
                          required
                          value={venueDidOrUrl}
                          onChange={e => { setVenueDidOrUrl(e.target.value); setError(""); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) addVenueToList(); }}
                          placeholder="Provide venue Url/DID"
                          disabled={loading}
                        />
                      </div>
                      {typeof window !== "undefined" &&
                        window.location.protocol === "https:" &&
                        isPrivateNetworkTarget(venueDidOrUrl.trim()) && (
                          <p className="text-xs text-muted-foreground w-full" data-testid="pna-hint">
                            This looks like a local/private venue. Chrome&apos;s Private Network
                            Access policy can silently block this https page from reaching it —
                            allow the request if prompted, or open this app over http instead.
                          </p>
                        )}
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
