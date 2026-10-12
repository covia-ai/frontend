"use client";

import { useEffect, useRef, useState } from "react";
import {
  toVenueDescriptor,
  useVenues,
  useVenuesHydrated,
  type VenueDescriptor,
} from "@/hooks/use-venues";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { connectVenue } from "@/lib/venue-registry";
import { publicCapsOf } from "@/lib/venue-public-caps";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { notifyError } from "@/lib/notify";
import { CoviaError } from "@covia/covia-sdk";

// Resolves the venue a page should read from. When `routeVenueId` is given
// (e.g. the [slug] segment of /venues/[slug]/assets), that venue is always
// used, even if it differs from whichever venue is globally selected —
// otherwise a venue-scoped route could silently render a different venue's
// data. Falls back to the globally selected venue only when no
// `routeVenueId` is given (e.g. the unscoped /assets, /operations, /jobs
// pages). If the route's venue isn't already known, it's connected to and
// added to the venues list, mirroring AdaptersList's resolution. Returning an
// explicit state keeps callers from rendering "no venues" while a routed
// venue is still connecting, or from silently going blank after it fails.
export type VenueResolution = {
  descriptor: VenueDescriptor | null;
  status: "absent" | "connecting" | "ready" | "unreachable";
  error: string | null;
};

// A did:key is an identity, not an address: there is nothing to connect to,
// so an unknown one can only be reported (#465).
export function isAddresslessVenueId(venueId: string): boolean {
  return venueId.startsWith("did:key:");
}

export const ADDRESSLESS_VENUE_DETAIL =
  "isn't in your venue list, and a did:key has no address to connect to. Add the venue by its URL or did:web first.";

export function useVenueForRoute(routeVenueId?: string): VenueResolution {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const addVenue = useVenues((state) => state.addVenue);
  const globalVenueObj = venues.find(
    (venue) => venue.venueId === selectedVenueId,
  );
  // A venue answers to several identifiers — its canonical did:key, its
  // did:web, its URL — but the store is only ever keyed by the canonical one
  // that connectVenue resolves. Remember which route id mapped to which
  // canonical id, so a route addressed by an alias finds the entry that was
  // actually added instead of waiting forever for one under the name it
  // asked for (#428).
  const [alias, setAlias] = useState<{ route: string; venueId: string } | null>(null);
  const aliasId = routeVenueId && alias?.route === routeVenueId ? alias.venueId : undefined;
  const found = routeVenueId
    ? venues.find((v) => v.venueId === routeVenueId || (!!aliasId && v.venueId === aliasId))
    : undefined;
  const auth = useAuthStore((state) =>
    routeVenueId ? state.authMap[routeVenueId] ?? null : null,
  );
  const connecting = useRef(new Set<string>());
  // A failed connect is remembered against the auth *object* it used. Store
  // values are immutable, so a fresh sign-in (even the same DID with a renewed
  // token) is a new object and retries — without ever serialising a key or
  // token into a lookup key.
  const [failure, setFailure] = useState<{
    venueId: string;
    auth: VenueAuth | null;
    error: string;
  } | null>(null);
  const hasFailed = failure !== null && failure.venueId === routeVenueId && failure.auth === auth;
  // During hydration the store reads as its initial, empty state, so every
  // routed venue looks unknown on the first client render. Deciding then
  // fired a connect for a venue that was already stored (#465).
  const hydrated = useVenuesHydrated();
  // Once the stored list has loaded, an unknown did:key can only be reported.
  const unknownKey = hydrated && !found && !!routeVenueId && isAddresslessVenueId(routeVenueId);

  useEffect(() => {
    if (!routeVenueId || !hydrated || found || unknownKey || hasFailed || connecting.current.has(routeVenueId)) return;
    connecting.current.add(routeVenueId);
    // `routeVenueId` is already decoded by the page. Decoding again would turn
    // a did:web port (`did:web:host%3A8080`, encoded by the DID spec itself)
    // into a path separator and connect to a different venue.
    reportVenueHealth(routeVenueId, { state: "connecting" });
    connectVenue(routeVenueId, auth, 10_000)
      .then((v) => {
        const descriptor = toVenueDescriptor(v);
        // A connect that resolves no identity cannot be stored or matched, so
        // it must end as an error. Otherwise the success path has no terminal
        // state and the caller waits on "connecting" forever (#428).
        if (!descriptor.venueId) {
          throw new CoviaError(
            `Connected to ${routeVenueId} but it reported no venue identity`,
          );
        }
        reportVenueHealth(v.baseUrl, {
          state: "connected",
          version: v.lastKnownStatus?.version,
          publicAccess: auth ? undefined : v.lastKnownStatus !== undefined,
          publicCaps: publicCapsOf(v.lastKnownStatus),
        });
        addVenue(descriptor);
        // The canonical id may differ from the one the route used (a did:web
        // or a URL resolves to a did:key). Record the mapping, or the lookup
        // above can never match what was just added.
        if (descriptor.venueId !== routeVenueId) {
          setAlias({ route: routeVenueId, venueId: descriptor.venueId });
        }
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        setFailure({ venueId: routeVenueId, auth, error });
        reportVenueHealth(routeVenueId, { state: "unreachable", detail: error });
        notifyError("Unable to connect to venue", err, routeVenueId);
      })
      .finally(() => {
        connecting.current.delete(routeVenueId);
      });
  }, [routeVenueId, hydrated, found, unknownKey, hasFailed, addVenue, auth]);

  if (!routeVenueId) {
    return {
      descriptor: globalVenueObj ?? null,
      status: globalVenueObj ? "ready" : "absent",
      error: null,
    };
  }
  if (found) return { descriptor: found, status: "ready", error: null };
  if (unknownKey) {
    return {
      descriptor: null,
      status: "unreachable",
      error: `${routeVenueId} ${ADDRESSLESS_VENUE_DETAIL}`,
    };
  }
  if (hasFailed) return { descriptor: null, status: "unreachable", error: failure.error };
  return { descriptor: null, status: "connecting", error: null };
}
