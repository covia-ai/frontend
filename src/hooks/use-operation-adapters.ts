"use client";

import { useEffect } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
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

type IndexOutcome = {
  venue: Venue | null;
  includeUserOps: boolean;
  index: OperationAdapterIndex | null;
};

const NO_INDEX: IndexOutcome = { venue: null, includeUserOps: false, index: null };

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
  // The outcome carries the inputs it answers, so a switch of venue or scope
  // reads as "no index yet" by comparison, with nothing to clear in an effect.
  const { data: outcome, run, invalidate } = useLatestQuery<IndexOutcome>(NO_INDEX);

  useEffect(() => {
    if (!venue) {
      invalidate();
      return;
    }
    void run(async () => ({
      venue,
      includeUserOps,
      index: await indexFor(venue, includeUserOps).catch(() => null),
    }));
  }, [venue, includeUserOps, run, invalidate]);

  const index =
    outcome.venue === venue && outcome.includeUserOps === includeUserOps ? outcome.index : null;
  return { adapterFor: (op?: string) => adapterForOp(index, op) };
}
