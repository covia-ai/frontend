"use client";

import { useEffect } from "react";
import type { Asset, Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { errorMessage, isNotFoundError } from "@/lib/errors";

type OperationAssetState = {
  asset?: Asset;
  errorMessage: string;
  notFound: boolean;
  loading: boolean;
};

// A resolution remembers which (venue, address) it answers, so a different
// address simply has no answer yet rather than a stale one to clear.
type Resolution = {
  venue: Venue;
  assetId: string;
  asset?: Asset;
  errorMessage: string;
  notFound: boolean;
};

const LOADING: OperationAssetState = { errorMessage: "", notFound: false, loading: true };

export function useOperationAsset(
  venue: Venue | undefined,
  assetId: string,
): OperationAssetState {
  const { data: resolution, run, invalidate } = useLatestQuery<Resolution | null>(null);

  useEffect(() => {
    // Stays loading while waiting on the venue — there's nothing to resolve
    // against yet, not a resolved-and-empty state.
    if (!venue) {
      invalidate();
      return;
    }
    void run(async () => {
      try {
        const asset = await resolveOperationByAddress(venue, assetId);
        return { venue, assetId, asset, errorMessage: "", notFound: false };
      } catch (error: unknown) {
        const notFound = isNotFoundError(error);
        return {
          venue,
          assetId,
          errorMessage: notFound ? "" : errorMessage(error, "Failed to load asset"),
          notFound,
        };
      }
    });
  }, [assetId, venue, run, invalidate]);

  const current =
    resolution && resolution.venue === venue && resolution.assetId === assetId ? resolution : null;
  if (!current) return LOADING;
  return {
    asset: current.asset,
    errorMessage: current.errorMessage,
    notFound: current.notFound,
    loading: false,
  };
}
