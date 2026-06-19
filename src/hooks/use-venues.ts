import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue } from "@covia/covia-sdk";

type VenuesStore = {
  venues: Venue[];
  addVenue: (venue: Venue) => void;
  removeVenue: (venueId: string) => void;
  updateVenue: (venueId: string, updates: Partial<Venue>) => void;
  getVenue:() => Venue[];
};

// Released (prod) venues — running the stable build, used in every environment.
// Unreachable ones are silently dropped by connectToVenues.
const prodVenueUrls =
[     "https://venue-1.covia.ai",
      "https://venue-2.covia.ai"
];

// Dev venues (running latest) plus the local venue — only outside production.
const devVenueUrls =
[     "https://venue-3.covia.ai",
      "https://venue-4.covia.ai",
      "https://venue-test.covia.ai",
      "http://localhost:8080"
];

const isProd = process.env.NEXT_PUBLIC_IS_ENV_PROD !== "false";
const defaultVenueUrls = isProd ? prodVenueUrls : [...prodVenueUrls, ...devVenueUrls];

// Connect to one venue, treating a slow handshake as unreachable so a single
// laggy or hanging venue can't stall the others (Venue.connect has no timeout).
const CONNECT_TIMEOUT_MS = 2000;
const connectWithTimeout = (venueId: string): Promise<Venue> =>
  Promise.race([
    Venue.connect(venueId),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out connecting to ${venueId}`)), CONNECT_TIMEOUT_MS)
    ),
  ]);

// Connect to the default venues, silently dropping any unreachable or slow ones.
const connectToVenues = async (): Promise<Venue[]> => {
  const venues = await Promise.allSettled(defaultVenueUrls.map(connectWithTimeout));
  return venues
    .filter((result): result is PromiseFulfilledResult<Venue> => result.status === "fulfilled")
    .map((result) => result.value);
};

export const useVenues = create(
  persist<VenuesStore>(
    (set, get) => ({
      venues: [],
       getVenue: () => {
        const state = get();
        return state.venues;
      },
      addVenue: (venue: Venue) => {
        set((state) => ({
          venues: [...state.venues, venue]
        }));
      },
      
      removeVenue: (venueId: string) => {
        set((state) => ({
          venues: state.venues.filter(venue => venue.venueId !== venueId)
        }));
      },
      
      updateVenue: (venueId: string, updates: Partial<Venue>) => {
        set((state) => ({
          venues: state.venues.map(venue => 
            venue.venueId === venueId 
              ? Object.assign(venue, updates)
              : venue
          )
        }));
      },
    }),
    {
      name: "venues",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

// Connect to the default venues in the background — never blocks app startup or
// navigation. Reachable venues are merged in as they resolve; persisted and
// user-added venues are preserved (matched by venueId).
connectToVenues().then((connected) => {
  if (connected.length === 0) return;
  useVenues.setState((state) => {
    const byId = new Map<string, Venue>(state.venues.map((v): [string, Venue] => [v.venueId, v]));
    for (const v of connected) byId.set(v.venueId, v);
    return { venues: Array.from(byId.values()) };
  });
});
