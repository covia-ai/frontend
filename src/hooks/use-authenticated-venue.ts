"use client";

import { useEffect, useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { reportVenueAuthHealth } from "@/hooks/use-venue-auth-health";
import { errorMessage, errorStatus, isAuthenticationRejectedError } from "@/lib/errors";
import { verifyVenueAccount } from "@/lib/venue-auth-probe";
import {
  evictVenueInstances,
  getVenueStatus,
  getVenueFor,
} from "@/lib/venue-registry";

export { evictVenueInstances, getVenueFor };

const AUTH_VALIDATION_TIMEOUT_MS = 10_000;

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

function validateVenue(
  venue: Venue,
  authData: VenueAuth | null,
  maxAgeMs?: number,
): void {
  if (authData) reportVenueAuthHealth(venue.venueId, authData, { state: "checking" });

    // This validation belongs to the cached (venue, account) instance, not to
    // the first indicator component that happened to request it. Let it finish
    // after that component unmounts; otherwise React Strict Mode's deliberate
    // effect cleanup would discard the result while the WeakSet prevents the
    // remount from retrying it.
    void getVenueStatus(venue, maxAgeMs)
      .then((status) => {
        reportVenueHealth(venue.baseUrl, {
          state: "connected",
          version: status?.version,
          publicAccess: authData ? undefined : status !== undefined,
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
        if (isAuthenticationRejectedError(error)) {
          reportVenueHealth(venue.baseUrl, {
            state: "connected",
            publicAccess: authData ? undefined : false,
          });
          if (authData) {
            reportVenueAuthHealth(venue.venueId, authData, {
              state: "rejected",
              detail: errorMessage(error, "This venue rejected the stored account"),
              status: errorStatus(error),
            });
          }
          return;
        }
        reportVenueHealth(venue.baseUrl, {
          state: "unreachable",
          detail: error instanceof Error ? error.message : String(error),
        });
      });
}

const validatedVenues = new WeakSet<Venue>();
export function useValidateVenue(
  venue: Venue | null | undefined,
  authData: VenueAuth | null = null,
): void {
  useEffect(() => {
    if (!venue || validatedVenues.has(venue)) return;
    validatedVenues.add(venue);
    validateVenue(venue, authData);
  }, [venue, authData]);
}

// Normal pages do not validate venues up front — reads fire optimistically
// (see useResolvedVenueContext). When a read DOES fail in a way that smells
// like a venue problem rather than a data problem, this forces a fresh
// status check so the health/auth stores converge on a definitive verdict
// (unreachable / auth-rejected) and the page can switch to the right state.
const lastFailureRevalidation = new WeakMap<Venue, number>();
const FAILURE_REVALIDATION_MIN_INTERVAL_MS = 10_000;

export function revalidateVenueOnFailure(
  venue: Venue | null | undefined,
  authData: VenueAuth | null,
  error: unknown,
): void {
  if (!venue) return;
  const status = errorStatus(error);
  // 4xx data errors (missing path, bad request) say nothing about the venue.
  const suspicious =
    status === undefined || status === 401 || status === 403 || status >= 500;
  if (!suspicious) return;
  const last = lastFailureRevalidation.get(venue) ?? 0;
  if (Date.now() - last < FAILURE_REVALIDATION_MIN_INTERVAL_MS) return;
  lastFailureRevalidation.set(venue, Date.now());
  validateVenue(venue, authData, 0);
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
