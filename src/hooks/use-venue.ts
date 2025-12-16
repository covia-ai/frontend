import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue } from "@covia-ai/covialib";

type VenueStore = {
  currentVenue: Venue | null;
  setCurrentVenue: (venue: Venue) => void;
  getCurrentVenue: () => Venue | null;
};

export const useVenue = create(
  persist<VenueStore>(
    (set, get) => ({
      currentVenue: null,
      
      setCurrentVenue: (venue: Venue) => {
        set({ currentVenue: venue });
      },
      
      getCurrentVenue: () => {
        const state = get();
        return state.currentVenue;
      },
    }),
    {
      name: "current-venue",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
