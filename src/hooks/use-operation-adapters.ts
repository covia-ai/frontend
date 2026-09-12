"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import {
  adapterForOp,
  buildOperationAdapterIndex,
  type OperationAdapterIndex,
} from "@/lib/operations-catalog";

// The adapter index is built from two job-free catalogue reads (see
// buildOperationAdapterIndex). It's keyed by content hash, and an asset id is
// the immutable hash of its metadata, so an index is safe to reuse for the life
// of a Venue instance. The Venue itself is cached per (venue, auth) by
// useAuthenticatedVenue, so caching on the instance scopes the index to the
// same (venue, auth) pair — and a catalogue read happens at most once per
// venue/auth, never per row.
const CACHE = new WeakMap<
  Venue,
  { includeUserOps: boolean; promise: Promise<OperationAdapterIndex> }
>();

function indexFor(venue: Venue, includeUserOps: boolean): Promise<OperationAdapterIndex> {
  const cached = CACHE.get(venue);
  // includeUserOps flips with sign-in, which widens the catalogue (w/ops); a
  // stale narrower index must be rebuilt rather than reused.
  if (cached && cached.includeUserOps === includeUserOps) return cached.promise;
  const promise = buildOperationAdapterIndex(venue, { includeUserOps });
  CACHE.set(venue, { includeUserOps, promise });
  return promise;
}

export type OperationAdapterResolver = {
  /** `operation.adapter` (dispatch form, e.g. `http:get`) for a job's `op`, or
   *  undefined until the index has loaded / when the op isn't in the catalogue. */
  adapterFor: (op?: string) => string | undefined;
};

/**
 * Resolves a job's operation adapter for icon selection without any per-row
 * network read. Returns a resolver immediately; it yields undefined until the
 * cached catalogue index has loaded, so callers must keep their own path-parse
 * and name fallbacks (operationVisual does). A build failure degrades silently
 * to those fallbacks rather than surfacing an error — the icon is cosmetic.
 */
export function useOperationAdapters(
  venue: Venue | null | undefined,
  includeUserOps: boolean,
): OperationAdapterResolver {
  const [index, setIndex] = useState<OperationAdapterIndex | null>(null);

  useEffect(() => {
    if (!venue) {
      setIndex(null);
      return;
    }
    let active = true;
    setIndex(null);
    indexFor(venue, includeUserOps)
      .then((next) => {
        if (active) setIndex(next);
      })
      .catch(() => {
        if (active) setIndex(null);
      });
    return () => {
      active = false;
    };
  }, [venue, includeUserOps]);

  return { adapterFor: (op?: string) => adapterForOp(index, op) };
}
