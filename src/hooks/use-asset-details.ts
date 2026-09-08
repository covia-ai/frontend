"use client";

import { useEffect } from "react";
import { assetHash, didUrl, Namespace, type Asset, type Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { isNotFoundError } from "@/lib/errors";

// GET /api/v1/assets/<id> only resolves the fully DID-qualified form — a
// bare hash or a bare "a/<hash>" both 404 on live venues, even though a
// content hash is otherwise a complete, venue-independent identity
// (frontend#341). Routes hand this hook the bare hash (see AssetHeader's
// generated links), so qualify it with this venue's own DID before asking.
// Anything already DID-qualified, or not a hash at all (a mutable w/…, o/…
// lattice path), passes through unchanged.
function qualifyAssetId(venue: Venue, assetId: string): string {
  if (assetId.startsWith("did:")) return assetId;
  const hash = assetHash(assetId);
  return hash ? didUrl(venue.venueId, Namespace.ASSET, hash) : assetId;
}

export function useAssetDetails(
  venue: Venue | null | undefined,
  assetId: string,
) {
  const {
    data: asset,
    loading,
    error,
    run,
    reset,
  } = useLatestQuery<Asset | null>(null, { initialLoading: true });

  useEffect(() => {
    if (!venue || !assetId) {
      reset();
      return;
    }
    void run(() => venue.getAsset(qualifyAssetId(venue, assetId)), { clear: true });
  }, [assetId, reset, run, venue]);

  const notFound = isNotFoundError(error);
  return { asset, loading, error: notFound ? null : error, notFound };
}
