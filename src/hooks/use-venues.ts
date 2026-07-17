import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Venue } from "@covia/covia-sdk";
import type { Auth } from "@covia/covia-sdk";
import { toast } from "sonner";
import { useVenue } from "@/hooks/use-venue";
import { evictVenueInstances } from "@/hooks/use-authenticated-venue";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { useAuthStore } from "@/hooks/use-auth";

type VenuesStore = {
  venues: Venue[];
  addVenue: (venue: Venue) => void;
  removeVenue: (venueId: string) => void;
  getVenue:() => Venue[];
};

// Released (prod) venues — running the stable build, used in every environment.
// Unreachable ones are silently dropped by connectToVenues.
const prodVenueUrls =
[     "https://venue-1.covia.ai",
      "https://venue-2.covia.ai"
];

// Dev venues (running latest) plus the local venue — only outside production.
// 127.0.0.1, not localhost: local venues bind IPv4 loopback only, and browsers
// resolve localhost to ::1 first — the hung IPv6 connect surfaces as
// "Failed to fetch" while curl/Node fall back and work (covia-ai/covia#231).
const devVenueUrls =
[     "https://venue-3.covia.ai",
      "https://venue-4.covia.ai",
      "https://venue-test.covia.ai",
      "http://127.0.0.1:8080"
];

const isProd = process.env.NEXT_PUBLIC_IS_ENV_PROD !== "false";
const defaultVenueUrls = isProd ? prodVenueUrls : [...prodVenueUrls, ...devVenueUrls];

// Connect to one venue, treating a slow handshake as unreachable so a single
// laggy or hanging venue can't stall the others (Venue.connect has no timeout).
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

// Connect to the default venues. Unreachable ones are dropped from the list
// but their failure is recorded in the health store — silent disappearance
// from the selector is how the localhost-IPv6 outage went unnoticed all day.
const connectToVenues = async (): Promise<Venue[]> => {
  const venues = await Promise.allSettled(
    defaultVenueUrls.map(async (url) => {
      reportVenueHealth(url, { state: "connecting" });
      try {
        const venue = await connectWithTimeout(url);
        reportVenueHealth(venue.baseUrl, { state: "connected", version: venue.lastKnownStatus?.version });
        if (venue.baseUrl !== url) reportVenueHealth(url, { state: "connected", version: venue.lastKnownStatus?.version });
        return venue;
      } catch (err: any) {
        reportVenueHealth(url, { state: "unreachable", detail: err?.message ?? String(err) });
        throw err;
      }
    })
  );
  return venues
    .filter((result): result is PromiseFulfilledResult<Venue> => result.status === "fulfilled")
    .map((result) => result.value);
};

export const useVenues = create(
  persist<VenuesStore>(
    (set, get) => ({
      venues: [],
       getVenue: () => {
        const state = get();
        return state.venues;
      },
      addVenue: (venue: Venue) => {
        set((state) => ({
          venues: [
            ...state.venues.filter(
              (existing) => existing.venueId !== venue.venueId && existing.baseUrl !== venue.baseUrl,
            ),
            venue,
          ]
        }));
      },
      
      removeVenue: (venueId: string) => {
        const remaining = get().venues.filter(venue => venue.venueId !== venueId);
        set({ venues: remaining });
        evictVenueInstances(venueId);

        const current = useVenue.getState().currentVenue;
        if (current?.venueId === venueId) {
          const replacement = remaining[0] ?? null;
          useVenue.getState().setCurrentVenue(replacement);
          useAuthStore.getState().setActiveVenue(replacement?.venueId ?? null);
        }
      },
    }),
    {
      name: "venues",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<VenuesStore>) };
        // Drop entries not keyed by DID (pre-DID persisted format, or venues
        // added before their status resolved). The SDK binds every auth JWT's
        // audience to `venueId`, so a URL-keyed venue makes the server 401
        // all authenticated calls — e.g. "unable to store secret" — while
        // anonymous reads keep working. Reachable venues are re-added
        // correctly keyed by the background connect loop.
        state.venues = (state.venues ?? []).filter(
          (v) => typeof v?.venueId === "string" && v.venueId.startsWith("did:")
        );
        return state;
      },
    }
  )
);

export type VenueReplacement = { oldId: string; newId: string; baseUrl: string; name?: string };

// Merge freshly connected venues into the stored list. A venue's identity is
// its DID; its baseUrl is only transport. When a fresh connect resolves a
// baseUrl to a DIFFERENT DID than a stored entry, the venue behind that
// address has restarted with a new identity — the stored entry is a corpse
// (its agents, secrets, and logins live on an instance that no longer
// exists), so it is dropped and reported rather than left as a ghost in the
// selector. Exported pure for tests.
export function reconcileVenues(
  existing: Venue[],
  connected: Venue[],
): { venues: Venue[]; replaced: VenueReplacement[] } {
  const byId = new Map<string, Venue>(existing.map((v): [string, Venue] => [v.venueId, v]));
  const replaced: VenueReplacement[] = [];
  for (const v of connected) {
    for (const [id, old] of byId) {
      if (id !== v.venueId && old.baseUrl === v.baseUrl) {
        byId.delete(id);
        replaced.push({ oldId: id, newId: v.venueId, baseUrl: v.baseUrl, name: v.metadata?.name });
      }
    }
    byId.set(v.venueId, v);
  }
  return { venues: Array.from(byId.values()), replaced };
}

// Connect to the default venues in the background — never blocks app startup or
// navigation. Reachable venues are merged in as they resolve; persisted and
// user-added venues are preserved (matched by venueId) unless reconciliation
// finds their identity is gone.
connectToVenues().then((connected) => {
  if (connected.length === 0) return;
  let replaced: VenueReplacement[] = [];
  useVenues.setState((state) => {
    const result = reconcileVenues(state.venues, connected);
    replaced = result.replaced;
    return { venues: result.venues };
  });

  // Keep the current selection alive: refresh its snapshot to the live
  // instance, or migrate it when its identity was replaced.
  const current = useVenue.getState().currentVenue;
  const live = useVenues.getState().venues;
  if (current) {
    const migration = replaced.find((r) => r.oldId === current.venueId);
    const target = migration
      ? live.find((v) => v.venueId === migration.newId)
      : live.find((v) => v.venueId === current.venueId);
    if (target && target !== current) useVenue.getState().setCurrentVenue(target);
  }

  for (const r of replaced) {
    evictVenueInstances(r.oldId);
    toast.warning(`Venue at ${r.baseUrl} has a new identity`, {
      description:
        `${r.name ?? "The venue"} restarted with a fresh DID. Sign-ins, agents and ` +
        `secrets from its previous run no longer apply — sign in again to continue.`,
      duration: 15000,
      closeButton: true,
    });
  }
});
