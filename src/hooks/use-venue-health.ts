"use client";

import { create } from "zustand";

// In-memory (never persisted) reachability state per venue transport address.
// Keyed by baseUrl, not DID: health describes the address we probe, and it
// must be reportable before the venue's identity is known (during connect)
// and after it stops answering. Fed by the background connect loop and by
// getVenueFor's validation status(); read by the venue selector and cards so
// an unreachable venue is visible instead of silently failing page by page.
export type VenueHealth =
  | { state: "connecting"; checkedAt: number }
  | { state: "connected"; version?: string; publicAccess?: boolean; checkedAt: number }
  | { state: "unreachable"; detail: string; checkedAt: number };

type VenueHealthStore = {
  byUrl: Record<string, VenueHealth>;
  report: (baseUrl: string, health: VenueHealth) => void;
};

export const useVenueHealth = create<VenueHealthStore>((set) => ({
  byUrl: {},
  report: (baseUrl, health) =>
    set((s) => ({ byUrl: { ...s.byUrl, [baseUrl]: health } })),
}));

export function reportVenueHealth(
  baseUrl: string | undefined,
  health: { state: "connecting" } | { state: "connected"; version?: string; publicAccess?: boolean } | { state: "unreachable"; detail: string },
): void {
  if (!baseUrl) return;
  useVenueHealth.getState().report(baseUrl, { ...health, checkedAt: Date.now() } as VenueHealth);
}
