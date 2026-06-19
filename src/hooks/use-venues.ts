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

// Connect to venues, silently dropping any that are unreachable
const connectToVenues = async (): Promise<Venue[]> => {
  const venues = await Promise.allSettled(
    defaultVenueUrls.map((venueId) => Venue.connect(venueId))
  );

  return venues
    .filter((result): result is PromiseFulfilledResult<Venue> => result.status === "fulfilled")
    .map((result) => result.value);
};

const defaultVenues: Venue[] = await connectToVenues();

export const useVenues = create(
  persist<VenuesStore>(
    (set, get) => ({
      venues: defaultVenues,
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
