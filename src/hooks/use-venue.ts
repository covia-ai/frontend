import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue } from "@/lib/covia";

type VenueStore = {
  venue:Venue;
};

export const useVenue = create(
  persist<VenueStore>(
    (set, get) => ({
        venue: new Venue(),
        setVenue: (venue: Venue) => {
            set({ venue });
        },
        getVenue: () => {
           const state = get();
           return state.venue;
      },
    }),
    {
      name: "venue",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
