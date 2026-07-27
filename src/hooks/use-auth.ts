"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useVenues } from "@/hooks/use-venues";

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
  authMap: Record<string, VenueAuth>;
  deviceKeyHex: string | null;
  loginWithToken: (venueId: string, token: string, did: string) => void;
  loginWithKeypair: (venueId: string, privateKeyHex: string, did: string) => void;
  getDeviceKeyHex: () => string | null;
  setDeviceKeyHex: (hex: string) => void;
  logout: (venueId: string) => void;
  getAuthForVenue: (venueId: string) => VenueAuth | null;
};

export function useCurrentAuth(): VenueAuth | null {
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  return useAuthStore((state) =>
    selectedVenueId ? state.authMap[selectedVenueId] ?? null : null,
  );
}

export function useIsAuthenticated(): boolean {
  return useCurrentAuth() !== null;
}

export const useAuthStore = create(
  persist<AuthStore>(
    (set, get) => ({
      authMap: {},
      deviceKeyHex: null,

      loginWithToken: (venueId: string, token: string, did: string) => {
        const newMap = { ...get().authMap, [venueId]: { type: "bearer" as const, token, did } };
        set({ authMap: newMap });
      },

      loginWithKeypair: (venueId: string, privateKeyHex: string, did: string) => {
        const newMap = { ...get().authMap, [venueId]: { type: "keypair" as const, privateKeyHex, did } };
        set({ authMap: newMap });
      },

      getDeviceKeyHex: () => {
        return get().deviceKeyHex;
      },

      setDeviceKeyHex: (hex: string) => {
        set({ deviceKeyHex: hex });
      },

      logout: (venueId: string) => {
        const { authMap } = get();
        if (authMap[venueId]) {
          const { [venueId]: _, ...rest } = authMap;
          set({ authMap: rest });
        }
      },

      getAuthForVenue: (venueId: string) => {
        return get().authMap[venueId] ?? null;
      },
    }),
    {
      name: "venue-auth",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const old = persisted as {
          authMap?: Record<string, VenueAuth>;
          deviceKeyHex?: string | null;
          auth?: VenueAuth | Omit<BearerVenueAuth, "type">;
          activeVenueId?: string | null;
        };
        let authMap = old.authMap ?? {};
        // Backward compat: migrate old single-auth format to authMap
        if (old?.auth && !old?.authMap) {
          let auth = old.auth;
          // Old format without type field
          if (!("type" in auth)) {
            auth = { type: "bearer", ...auth };
          }
          const venueId = old.activeVenueId || "_migrated";
          authMap = { [venueId]: auth };
        }
        return {
          ...current,
          authMap,
          deviceKeyHex: old.deviceKeyHex ?? null,
        };
      },
    }
  )
);
