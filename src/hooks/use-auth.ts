"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useVenues } from "@/hooks/use-venues";
import { browserStorage } from "@/lib/persist-storage";

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

// An account is identified within a venue by (did, type) — the same DID can in
// principle exist both as a device key and as an OAuth identity.
const sameAccount = (a: VenueAuth, did: string, type?: VenueAuth["type"]) =>
  a.did === did && (type === undefined || a.type === type);

// Most-recently-used first, deduplicated by (did, type).
function upsertAccount(list: VenueAuth[] | undefined, auth: VenueAuth): VenueAuth[] {
  return [auth, ...(list ?? []).filter((a) => !sameAccount(a, auth.did, auth.type))];
}

type AuthStore = {
  // The active account per venue — what the rest of the app authenticates with.
  authMap: Record<string, VenueAuth>;
  // Every account ever used per venue, most-recently-used first. Lets a venue
  // switch (or a sign-out) keep its accounts choosable without re-entering
  // tokens or keys. Forgotten only via removeAccount.
  accountsMap: Record<string, VenueAuth[]>;
  // The default device key — what the sign-in dialog offers first.
  deviceKeyHex: string | null;
  // Every local Ed25519 keypair this browser knows (private key hex). The
  // default key is one of these; managed on the profile's Keys tab.
  deviceKeys: string[];
  addDeviceKey: (hex: string) => void;
  removeDeviceKey: (hex: string) => void;
  loginWithToken: (venueId: string, token: string, did: string) => void;
  loginWithKeypair: (venueId: string, privateKeyHex: string, did: string) => void;
  // Reactivate a known account on a venue (also marks it most recently used).
  switchAccount: (venueId: string, did: string, type?: VenueAuth["type"]) => void;
  // Forget an account entirely; clears the active slot if it was active.
  removeAccount: (venueId: string, did: string, type?: VenueAuth["type"]) => void;
  getDeviceKeyHex: () => string | null;
  setDeviceKeyHex: (hex: string) => void;
  // Deactivates the venue's account but keeps it in accountsMap, so it can be
  // re-chosen later without re-authenticating. removeAccount forgets for real.
  logout: (venueId: string) => void;
  // Drops ALL auth state for a venue id — used when a venue's identity is
  // replaced (restart with a fresh DID): credentials scoped to the dead
  // identity can never be valid again, so keeping them only leaves orphans.
  purgeVenueAuth: (venueId: string) => void;
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
      accountsMap: {},
      deviceKeyHex: null,
      deviceKeys: [],

      addDeviceKey: (hex: string) => {
        const { deviceKeys, deviceKeyHex } = get();
        set({
          deviceKeys: deviceKeys.includes(hex) ? deviceKeys : [...deviceKeys, hex],
          // The first key a browser learns becomes its default.
          deviceKeyHex: deviceKeyHex ?? hex,
        });
      },

      removeDeviceKey: (hex: string) => {
        const { deviceKeys, deviceKeyHex } = get();
        const remaining = deviceKeys.filter((k) => k !== hex);
        set({
          deviceKeys: remaining,
          deviceKeyHex: deviceKeyHex === hex ? remaining[0] ?? null : deviceKeyHex,
        });
      },

      loginWithToken: (venueId: string, token: string, did: string) => {
        const auth: VenueAuth = { type: "bearer", token, did };
        const { authMap, accountsMap } = get();
        set({
          authMap: { ...authMap, [venueId]: auth },
          accountsMap: { ...accountsMap, [venueId]: upsertAccount(accountsMap[venueId], auth) },
        });
      },

      loginWithKeypair: (venueId: string, privateKeyHex: string, did: string) => {
        const auth: VenueAuth = { type: "keypair", privateKeyHex, did };
        const { authMap, accountsMap } = get();
        set({
          authMap: { ...authMap, [venueId]: auth },
          accountsMap: { ...accountsMap, [venueId]: upsertAccount(accountsMap[venueId], auth) },
        });
      },

      switchAccount: (venueId: string, did: string, type?: VenueAuth["type"]) => {
        const { authMap, accountsMap } = get();
        const account = (accountsMap[venueId] ?? []).find((a) => sameAccount(a, did, type));
        if (!account) return;
        set({
          authMap: { ...authMap, [venueId]: account },
          accountsMap: { ...accountsMap, [venueId]: upsertAccount(accountsMap[venueId], account) },
        });
      },

      removeAccount: (venueId: string, did: string, type?: VenueAuth["type"]) => {
        const { authMap, accountsMap } = get();
        const remaining = (accountsMap[venueId] ?? []).filter(
          (a) => !sameAccount(a, did, type),
        );
        const nextAccounts = { ...accountsMap };
        if (remaining.length > 0) nextAccounts[venueId] = remaining;
        else delete nextAccounts[venueId];

        const nextAuth = { ...authMap };
        const active = authMap[venueId];
        if (active && sameAccount(active, did, type)) delete nextAuth[venueId];

        set({ authMap: nextAuth, accountsMap: nextAccounts });
      },

      getDeviceKeyHex: () => {
        return get().deviceKeyHex;
      },

      setDeviceKeyHex: (hex: string) => {
        const { deviceKeys } = get();
        set({
          deviceKeyHex: hex,
          // Every key that becomes default is also a known key.
          deviceKeys: deviceKeys.includes(hex) ? deviceKeys : [...deviceKeys, hex],
        });
      },

      logout: (venueId: string) => {
        const { authMap } = get();
        if (authMap[venueId]) {
          const { [venueId]: _, ...rest } = authMap;
          set({ authMap: rest });
        }
      },

      purgeVenueAuth: (venueId: string) => {
        const { authMap, accountsMap } = get();
        const { [venueId]: _droppedAuth, ...restAuth } = authMap;
        const { [venueId]: _droppedAccounts, ...restAccounts } = accountsMap;
        set({ authMap: restAuth, accountsMap: restAccounts });
      },

      getAuthForVenue: (venueId: string) => {
        return get().authMap[venueId] ?? null;
      },
    }),
    {
      name: "venue-auth",
      storage: createJSONStorage(browserStorage),
      merge: (persisted, current) => {
        const old = persisted as {
          authMap?: Record<string, VenueAuth>;
          accountsMap?: Record<string, VenueAuth[]>;
          deviceKeyHex?: string | null;
          deviceKeys?: string[];
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
        // Account history arrived after authMap — seed it from the active
        // entries so pre-existing sign-ins appear in the Accounts panel.
        const accountsMap =
          old.accountsMap ??
          Object.fromEntries(
            Object.entries(authMap).map(([venueId, auth]) => [venueId, [auth]]),
          );
        const deviceKeyHex = old.deviceKeyHex ?? null;
        // The key list arrived after the single default key — seed it so the
        // existing key shows up on the Keys tab.
        const deviceKeys =
          old.deviceKeys ?? (deviceKeyHex ? [deviceKeyHex] : []);
        return {
          ...current,
          authMap,
          accountsMap,
          deviceKeyHex,
          deviceKeys,
        };
      },
    }
  )
);
