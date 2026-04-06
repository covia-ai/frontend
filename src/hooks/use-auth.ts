"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BearerVenueAuth = {
  type: "bearer";
  token: string;
  did: string;
};

export type KeyPairVenueAuth = {
  type: "keypair";
  privateKeyHex: string;
  did: string;
};

export type VenueAuth = BearerVenueAuth | KeyPairVenueAuth;

type AuthStore = {
  auth: VenueAuth | null;
  deviceKeyHex: string | null;
  loginWithToken: (token: string, did: string) => void;
  loginWithKeypair: (privateKeyHex: string, did: string) => void;
  getDeviceKeyHex: () => string | null;
  setDeviceKeyHex: (hex: string) => void;
  logout: () => void;
  getAuth: () => VenueAuth | null;
};

export const useAuthStore = create(
  persist<AuthStore>(
    (set, get) => ({
      auth: null,
      deviceKeyHex: null,

      loginWithToken: (token: string, did: string) => {
        set({ auth: { type: "bearer", token, did } });
      },

      loginWithKeypair: (privateKeyHex: string, did: string) => {
        set({ auth: { type: "keypair", privateKeyHex, did } });
      },

      getDeviceKeyHex: () => {
        return get().deviceKeyHex;
      },

      setDeviceKeyHex: (hex: string) => {
        set({ deviceKeyHex: hex });
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
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<AuthStore>) };
        // Backward compat: old format { token, did } has no type field
        if (state.auth && !("type" in state.auth)) {
          state.auth = { type: "bearer", ...(state.auth as any) };
        }
        return state;
      },
    }
  )
);
