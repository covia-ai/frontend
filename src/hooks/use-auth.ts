"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type VenueAuth = {
  token: string;
  did: string;
};

type AuthStore = {
  auth: VenueAuth | null;
  loginWithToken: (token: string, did: string) => void;
  logout: () => void;
  getAuth: () => VenueAuth | null;
};

export const useAuthStore = create(
  persist<AuthStore>(
    (set, get) => ({
      auth: null,

      loginWithToken: (token: string, did: string) => {
        set({ auth: { token, did } });
      },

      logout: () => {
        set({ auth: null });
      },

      getAuth: () => {
        return get().auth;
      },
    }),
    {
      name: "venue-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
