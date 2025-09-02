import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue } from "@/lib/covia";

type VenuesStore = {
  venues: Venue[];
  addVenue: (venue: Venue) => void;
  removeVenue: (venueId: string) => void;
  updateVenue: (venueId: string, updates: Partial<Venue>) => void;
};

// Default venues
let defaultVenues: Venue[] = [];
if(process.env.NEXT_PUBLIC_IS_ENV_PROD == "true") {
  defaultVenues = [
    new Venue({
      baseUrl: "https://venue-test.covia.ai",
      venueId: "test-venue"
    }),
    new Venue({
      baseUrl: "http://localhost:8080",
      venueId: "local-venue"
    })
 ];
 // Set names for the default venues
defaultVenues[0].name = "Test-Prod Venue";
defaultVenues[0].metadata.description = "Test Covia Venue ";
defaultVenues[1].name = "Local Venue";
defaultVenues[1].metadata.description = "Local Development Venue";
}
else {
  defaultVenues = [
    new Venue({
      baseUrl: "https://venue-test.covia.ai",
      venueId: "test-venue"
    }),
    new Venue({
      baseUrl: "http://localhost:8080",
      venueId: "local-venue"
    })
 ];
 // Set names for the default venues
defaultVenues[0].name = "Test Venue ";
defaultVenues[0].metadata.description = "Test Covia Venue";
defaultVenues[1].name = "Local Venue";
defaultVenues[1].metadata.description = "Local Development Venue";
}

console.log(defaultVenues)
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
              ? { ...venue, ...updates }
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
