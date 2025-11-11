import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue,Grid } from "@/lib/covia";
import { CredentialsHTTP } from "@/lib/covia/Credentials";

type VenuesStore = {
  venues: Venue[];
  addVenue: (venue: Venue) => void;
  removeVenue: (venueId: string) => void;
  updateVenue: (venueId: string, updates: Partial<Venue>) => void;
};

// Default venues
const defaultVenueUrls = 
[     "did:web:venue-1.covia.ai",
      "did:web:venue-2.covia.ai",
      "did:web:venue-test.covia.ai"
];
const defaultVenues: Venue[] = [];
if(!process.env.NEXT_PUBLIC_IS_ENV_PROD) 
    defaultVenueUrls.push("http://localhost:8080");

defaultVenueUrls.map((venueId => {
    Grid.connect(venueId, new CredentialsHTTP(venueId,"","")).then((venue => {
         defaultVenues.push(venue)
  }))
}))


export const useVenues = create(
  persist<VenuesStore>(
    (set, get) => ({
      venues: defaultVenues,
      
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
