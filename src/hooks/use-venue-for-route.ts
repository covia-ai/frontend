"use client";

import { useEffect, useRef, useState } from "react";
import {
  toVenueDescriptor,
  useVenues,
  type VenueDescriptor,
} from "@/hooks/use-venues";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { connectVenue } from "@/lib/venue-registry";
import { reportVenueHealth } from "@/hooks/use-venue-health";
import { notifyError } from "@/lib/notify";

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

export function useVenueForRoute(routeVenueId?: string): VenueResolution {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const addVenue = useVenues((state) => state.addVenue);
  const globalVenueObj = venues.find(
    (venue) => venue.venueId === selectedVenueId,
  );
  const found = routeVenueId ? venues.find((v) => v.venueId === routeVenueId) : undefined;
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

  useEffect(() => {
    if (!routeVenueId || found || hasFailed || connecting.current.has(routeVenueId)) return;
    connecting.current.add(routeVenueId);
    // `routeVenueId` is already decoded by the page. Decoding again would turn
    // a did:web port (`did:web:host%3A8080`, encoded by the DID spec itself)
    // into a path separator and connect to a different venue.
    reportVenueHealth(routeVenueId, { state: "connecting" });
    connectVenue(routeVenueId, auth, 10_000)
      .then((v) => {
        reportVenueHealth(v.baseUrl, {
          state: "connected",
          version: v.lastKnownStatus?.version,
          publicAccess: auth ? undefined : v.lastKnownStatus !== undefined,
        });
        addVenue(toVenueDescriptor(v));
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
  }, [routeVenueId, found, hasFailed, addVenue, auth]);

  if (!routeVenueId) {
    return {
      descriptor: globalVenueObj ?? null,
      status: globalVenueObj ? "ready" : "absent",
      error: null,
    };
  }
  if (found) return { descriptor: found, status: "ready", error: null };
  if (hasFailed) return { descriptor: null, status: "unreachable", error: failure.error };
  return { descriptor: null, status: "connecting", error: null };
}
