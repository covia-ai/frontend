"use client";

import { useEffect, useMemo } from "react";
import { fetchWithError, Venue } from "@covia/covia-sdk";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { useVenues, type VenueDescriptor } from "@/hooks/use-venues";
import { createAuthProvider } from "@/lib/auth-provider";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { reportVenueAuthHealth } from "@/hooks/use-venue-auth-health";
import { errorMessage, errorStatus, isAuthenticationRejectedError } from "@/lib/errors";

// One shared Venue instance per (venue, auth). The SDK accumulates
// per-instance state (asset cache, capability detection), which a fresh
// instance per component or render would throw away. Instances are created
// lazily on first use, and the connection is validated by a background
// status() — never blocking navigation on a dead venue (f503fc8).
type CachedVenue = {
  descriptor: VenueDescriptor;
  auth: VenueAuth | null;
  venue: Venue;
};

const venueCache = new Map<string, CachedVenue>();
const AUTH_VALIDATION_TIMEOUT_MS = 10_000;

async function verifyVenueAccount(venue: Venue): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  venue.auth.apply(headers, venue.venueId);

  // This is the permission-neutral caller-owned collection on current Covia
  // venues. Call the GET directly: AgentManager.list() may invoke on legacy
  // venues, and a background health check must never create a job.
  await fetchWithError(
    `${venue.baseUrl}/api/v1/agents?includeTerminated=false`,
    { headers },
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Drop every cached instance for a venueId — called when reconciliation
// discovers the venue behind an id no longer exists (e.g. restarted with a
// fresh identity), so stale instances can't keep signing JWTs for a dead
// audience or serving its cached state.
export function evictVenueInstances(venueId: string): void {
  venueCache.delete(venueId);
}

export function getVenueFor(
  venueObj: VenueDescriptor,
  authData: VenueAuth | null,
): Venue {
  const cached = venueCache.get(venueObj.venueId);
  if (
    cached &&
    cached.auth === authData &&
    cached.descriptor.baseUrl === venueObj.baseUrl
  ) {
    return cached.venue;
  }

  const venue = new Venue({
      baseUrl: venueObj.baseUrl,
      venueId: venueObj.venueId,
      name: venueObj.metadata?.name,
      auth: createAuthProvider(authData),
  });
  venueCache.set(venueObj.venueId, {
    descriptor: venueObj,
    auth: authData,
    venue,
  });
  return venue;
}

const validatedVenues = new WeakSet<Venue>();
export function useValidateVenue(
  venue: Venue | null | undefined,
  authData: VenueAuth | null = null,
): void {
  useEffect(() => {
    if (!venue || validatedVenues.has(venue)) return;
    validatedVenues.add(venue);
    if (authData) reportVenueAuthHealth(venue.venueId, authData, { state: "checking" });

    // This validation belongs to the cached (venue, account) instance, not to
    // the first indicator component that happened to request it. Let it finish
    // after that component unmounts; otherwise React Strict Mode's deliberate
    // effect cleanup would discard the result while the WeakSet prevents the
    // remount from retrying it.
    void venue
      .status()
      .then((status) => {
        reportVenueHealth(venue.baseUrl, {
          state: "connected",
          version: status?.version,
          publicAccess: authData ? undefined : true,
        });
        if (!authData) return;
        // Verify the account separately from the public status endpoint.
        void withTimeout(
          verifyVenueAccount(venue),
          AUTH_VALIDATION_TIMEOUT_MS,
          "Timed out verifying this account",
        )
          .then(() => {
            reportVenueAuthHealth(venue.venueId, authData, { state: "accepted" });
          })
          .catch((error: unknown) => {
            const detail = errorMessage(error, "Unable to verify account");
            if (isAuthenticationRejectedError(error)) {
              reportVenueAuthHealth(venue.venueId, authData, {
                state: "rejected",
                detail,
                status: errorStatus(error),
              });
            } else {
              reportVenueAuthHealth(venue.venueId, authData, { state: "unverified", detail });
            }
          });
      })
      .catch((error: unknown) => {
        if (!authData && isAuthenticationRejectedError(error)) {
          reportVenueHealth(venue.baseUrl, {
            state: "connected",
            publicAccess: false,
          });
          return;
        }
        reportVenueHealth(venue.baseUrl, {
          state: "unreachable",
          detail: error instanceof Error ? error.message : String(error),
        });
      });
  }, [venue, authData]);
}

// Venue selectors and venue cards render every configured venue, including
// those not used by the current page. Each visible indicator calls this hook
// so background venues cannot remain in the default "checking" state forever.
// getVenueFor + useValidateVenue deduplicate the actual probes per
// (descriptor, account) Venue instance.
export function useValidateVenueById(venueId?: string): void {
  const descriptor = useVenues((state) =>
    venueId ? state.venues.find((venue) => venue.venueId === venueId) : undefined,
  );
  const authData = useAuthStore((state) =>
    venueId ? state.authMap[venueId] ?? null : null,
  );
  const venue = useMemo(
    () => descriptor ? getVenueFor(descriptor, authData) : undefined,
    [descriptor, authData],
  );
  useValidateVenue(venue, authData);
}

export function useAuthenticatedVenue(): Venue | null {
  const venueObj = useVenues((state) =>
    state.venues.find((venue) => venue.venueId === state.selectedVenueId),
  );
  const authData = useAuthStore((x) =>
    venueObj ? x.authMap[venueObj.venueId] ?? null : null
  );

  const venue = useMemo(() => {
    if (!venueObj) return null;
    return getVenueFor(venueObj, authData);
  }, [venueObj, authData]);
  useValidateVenue(venue, authData);
  return venue;
}
