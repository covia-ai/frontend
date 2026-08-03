"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue } from "@covia/covia-sdk";
import type { Auth } from "@covia/covia-sdk";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { browserStorage } from "@/lib/persist-storage";

export type VenueDescriptor = {
  venueId: string;
  baseUrl: string;
  metadata: {
    name?: string;
    description?: string;
  };
};

type VenueLike = Pick<Venue, "venueId" | "baseUrl" | "metadata"> | VenueDescriptor;

type VenuesStore = {
  venues: VenueDescriptor[];
  selectedVenueId: string | null;
  addVenue: (venue: VenueLike) => void;
  removeVenue: (venueId: string) => void;
  selectVenue: (venueId: string | null) => void;
};

export function toVenueDescriptor(venue: VenueLike): VenueDescriptor {
  return {
    venueId: venue.venueId,
    baseUrl: venue.baseUrl,
    metadata: {
      name: venue.metadata?.name,
      description: venue.metadata?.description,
    },
  };
}

// Released (prod) venues — running the stable build, used in every environment.
const prodVenueUrls = [
  "https://venue-1.covia.ai",
  "https://venue-2.covia.ai",
];

// Dev venues (running latest) plus the local venue — only outside production.
const devVenueUrls = [
  "https://venue-3.covia.ai",
  "https://venue-4.covia.ai",
  "https://venue-test.covia.ai",
  "http://127.0.0.1:8080",
];

const isProd = process.env.NEXT_PUBLIC_IS_ENV_PROD !== "false";
const defaultVenueUrls = isProd ? prodVenueUrls : [...prodVenueUrls, ...devVenueUrls];

const CONNECT_TIMEOUT_MS = 2000;
export const connectWithTimeout = (
  venueId: string,
  auth?: Auth,
  timeoutMs = CONNECT_TIMEOUT_MS,
): Promise<Venue> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out connecting to ${venueId}`)),
      timeoutMs,
    );

    Venue.connect(venueId, auth).then(
      (venue) => {
        clearTimeout(timer);
        resolve(venue);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

async function connectToDefaultVenues(): Promise<Venue[]> {
  const venues = await Promise.allSettled(
    defaultVenueUrls.map(async (url) => {
      reportVenueHealth(url, { state: "connecting" });
      try {
        const venue = await connectWithTimeout(url);
        const version = venue.lastKnownStatus?.version;
        reportVenueHealth(venue.baseUrl, { state: "connected", version });
        if (venue.baseUrl !== url) {
          reportVenueHealth(url, { state: "connected", version });
        }
        return venue;
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        reportVenueHealth(url, { state: "unreachable", detail });
        throw error;
      }
    }),
  );

  return venues
    .filter((result): result is PromiseFulfilledResult<Venue> => result.status === "fulfilled")
    .map((result) => result.value);
}

// Strict Mode can mount the runtime provider twice in development. Sharing the
// promise keeps venue discovery a single operation for the lifetime of a page.
let defaultVenueConnection: Promise<Venue[]> | undefined;
export function connectDefaultVenues(): Promise<Venue[]> {
  defaultVenueConnection ??= connectToDefaultVenues();
  return defaultVenueConnection;
}

function legacySelectedVenueId(): string | null {
  try {
    const raw = browserStorage().getItem("current-venue");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.state?.currentVenue?.venueId ?? null;
  } catch {
    return null;
  }
}

export const useVenues = create(
  persist<VenuesStore>(
    (set, get) => ({
      venues: [],
      selectedVenueId: null,

      addVenue: (venue) => {
        const descriptor = toVenueDescriptor(venue);
        set((state) => ({
          venues: [
            ...state.venues.filter(
              (existing) =>
                existing.venueId !== descriptor.venueId &&
                existing.baseUrl !== descriptor.baseUrl,
            ),
            descriptor,
          ],
          selectedVenueId: state.selectedVenueId ?? descriptor.venueId,
        }));
      },

      removeVenue: (venueId) => {
        const remaining = get().venues.filter((venue) => venue.venueId !== venueId);
        set((state) => ({
          venues: remaining,
          selectedVenueId:
            state.selectedVenueId === venueId
              ? remaining[0]?.venueId ?? null
              : state.selectedVenueId,
        }));
      },

      selectVenue: (venueId) => {
        set({ selectedVenueId: venueId });
      },
    }),
    {
      name: "venues",
      storage: createJSONStorage(browserStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<VenuesStore>;
        const venues = (saved.venues ?? [])
          .filter(
            (venue) =>
              typeof venue?.venueId === "string" &&
              venue.venueId.startsWith("did:") &&
              typeof venue.baseUrl === "string",
          )
          .map(toVenueDescriptor);
        const requestedSelection =
          saved.selectedVenueId ?? legacySelectedVenueId();
        const selectedVenueId = venues.some(
          (venue) => venue.venueId === requestedSelection,
        )
          ? requestedSelection
          : venues[0]?.venueId ?? null;

        return { ...current, venues, selectedVenueId };
      },
    },
  ),
);

// Storage reads are synchronous, but persist still defers `hasHydrated()`
// through a microtask, so the very first render of anything reading this
// store precedes it. Callers that treat an empty/default store as meaningful
// (e.g. VenueRuntimeProvider's stale-selection guard, covia-ai/frontend#209)
// must wait for this before acting.
export function useVenuesHydrated(): boolean {
  return useSyncExternalStore(
    useVenues.persist.onFinishHydration,
    useVenues.persist.hasHydrated,
    () => false,
  );
}

export type VenueReplacement = {
  oldId: string;
  newId: string;
  baseUrl: string;
  name?: string;
};

export function reconcileVenues(
  existing: VenueDescriptor[],
  connected: VenueLike[],
): { venues: VenueDescriptor[]; replaced: VenueReplacement[] } {
  const byId = new Map(existing.map((venue) => [venue.venueId, venue]));
  const replaced: VenueReplacement[] = [];

  for (const connectedVenue of connected) {
    const venue = toVenueDescriptor(connectedVenue);
    for (const [id, old] of byId) {
      if (id !== venue.venueId && old.baseUrl === venue.baseUrl) {
        byId.delete(id);
        replaced.push({
          oldId: id,
          newId: venue.venueId,
          baseUrl: venue.baseUrl,
          name: venue.metadata.name,
        });
      }
    }
    byId.set(venue.venueId, venue);
  }

  return { venues: Array.from(byId.values()), replaced };
}
