import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue,Grid,CredentialsHTTP } from "@covia/covia-sdk";

type VenuesStore = {
  venues: Venue[];
  addVenue: (venue: Venue) => void;
  removeVenue: (venueId: string) => void;
  updateVenue: (venueId: string, updates: Partial<Venue>) => void;
  getVenue:() => Venue[];
};

// Default venues
const defaultVenueUrls = 
[     "did:web:venue-1.covia.ai",
      "did:web:venue-2.covia.ai",
      "did:web:venue-test.covia.ai"
];
if(process.env.NEXT_PUBLIC_IS_ENV_PROD == "false") 
    defaultVenueUrls.push("http://localhost:8080");

// Connect to venues with error handling
const connectToVenues = async (): Promise<Venue[]> => {
  const venues = await Promise.allSettled(
    defaultVenueUrls.map(async (venueId) => {
      try {
        return await Grid.connect(venueId, new CredentialsHTTP(venueId, "", ""));
      } catch (error) {
        console.error(`Failed to connect to venue ${venueId}:`, error);
        throw error;
      }
    })
  );

  // Filter out failed connections and return only successful venues
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
