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

function deriveAuth(authMap: Record<string, VenueAuth>, activeVenueId: string | null): VenueAuth | null {
  if (!activeVenueId) return null;
  return authMap[activeVenueId] ?? null;
}

type AuthStore = {
  authMap: Record<string, VenueAuth>;
  activeVenueId: string | null;
  /** Derived from authMap + activeVenueId. Use this for the current venue's auth. */
  auth: VenueAuth | null;
  deviceKeyHex: string | null;
  loginWithToken: (venueId: string, token: string, did: string) => void;
  loginWithKeypair: (venueId: string, privateKeyHex: string, did: string) => void;
  getDeviceKeyHex: () => string | null;
  setDeviceKeyHex: (hex: string) => void;
  setActiveVenue: (venueId: string) => void;
  logout: () => void;
  getAuth: () => VenueAuth | null;
  getAuthForVenue: (venueId: string) => VenueAuth | null;
};

export const useAuthStore = create(
  persist<AuthStore>(
    (set, get) => ({
      authMap: {},
      activeVenueId: null,
      auth: null,
      deviceKeyHex: null,

      loginWithToken: (venueId: string, token: string, did: string) => {
        const newMap = { ...get().authMap, [venueId]: { type: "bearer" as const, token, did } };
        set({
          authMap: newMap,
          activeVenueId: venueId,
          auth: newMap[venueId],
        });
      },

      loginWithKeypair: (venueId: string, privateKeyHex: string, did: string) => {
        const newMap = { ...get().authMap, [venueId]: { type: "keypair" as const, privateKeyHex, did } };
        set({
          authMap: newMap,
          activeVenueId: venueId,
          auth: newMap[venueId],
        });
      },

      getDeviceKeyHex: () => {
        return get().deviceKeyHex;
      },

      setDeviceKeyHex: (hex: string) => {
        set({ deviceKeyHex: hex });
      },

      setActiveVenue: (venueId: string) => {
        set({
          activeVenueId: venueId,
          auth: deriveAuth(get().authMap, venueId),
        });
      },

      logout: () => {
        const { activeVenueId, authMap } = get();
        if (activeVenueId && authMap[activeVenueId]) {
          const { [activeVenueId]: _, ...rest } = authMap;
          set({ authMap: rest, auth: null });
        }
      },

      getAuth: () => {
        const { activeVenueId, authMap } = get();
        return deriveAuth(authMap, activeVenueId);
      },

      getAuthForVenue: (venueId: string) => {
        return get().authMap[venueId] ?? null;
      },
    }),
    {
      name: "venue-auth",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<AuthStore>) };
        // Backward compat: migrate old single-auth format to authMap
        const old = persisted as any;
        if (old?.auth && !old?.authMap) {
          let auth = old.auth;
          // Old format without type field
          if (!("type" in auth)) {
            auth = { type: "bearer", ...auth };
          }
          const venueId = state.activeVenueId || "_migrated";
          state.authMap = { [venueId]: auth };
        }
        if (!state.authMap) {
          state.authMap = {};
        }
        // Derive auth from restored state
        state.auth = deriveAuth(state.authMap, state.activeVenueId);
        return state;
      },
    }
  )
);
