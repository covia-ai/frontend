"use client";

import { create } from "zustand";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";

export type VenueAuthHealth =
  | { state: "checking"; accountKey: string; checkedAt: number }
  | { state: "accepted"; accountKey: string; checkedAt: number }
  | { state: "rejected"; accountKey: string; detail: string; status?: number; checkedAt: number }
  | { state: "unverified"; accountKey: string; detail: string; checkedAt: number };

type VenueAuthHealthStore = {
  byVenue: Record<string, VenueAuthHealth>;
  report: (venueId: string, health: VenueAuthHealth) => void;
};

export const useVenueAuthHealth = create<VenueAuthHealthStore>((set) => ({
  byVenue: {},
  report: (venueId, health) =>
    set((state) => ({ byVenue: { ...state.byVenue, [venueId]: health } })),
}));

export function venueAuthAccountKey(auth: VenueAuth): string {
  return `${auth.type}:${auth.did}`;
}

export function reportVenueAuthHealth(
  venueId: string,
  auth: VenueAuth,
  health:
    | { state: "checking" }
    | { state: "accepted" }
    | { state: "rejected"; detail: string; status?: number }
    | { state: "unverified"; detail: string },
): void {
  useVenueAuthHealth.getState().report(venueId, {
    ...health,
    accountKey: venueAuthAccountKey(auth),
    checkedAt: Date.now(),
  } as VenueAuthHealth);
}

export type VenueAccessState =
  | { state: "signed-out" }
  | { state: "checking" }
  | { state: "accepted" }
  | { state: "rejected"; detail: string; status?: number }
  | { state: "unverified"; detail: string };

export function useVenueAccessState(venueId?: string): VenueAccessState {
  const auth = useAuthStore((state) => venueId ? state.authMap[venueId] ?? null : null);
  const health = useVenueAuthHealth((state) => venueId ? state.byVenue[venueId] : undefined);
  if (!auth) return { state: "signed-out" };
  if (!health || health.accountKey !== venueAuthAccountKey(auth)) return { state: "checking" };
  if (health.state === "rejected") return { state: "rejected", detail: health.detail, status: health.status };
  if (health.state === "unverified") return { state: "unverified", detail: health.detail };
  return { state: health.state };
}
