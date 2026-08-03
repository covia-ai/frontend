"use client";

import { useEffect } from "react";
import type { Asset, Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";

// useLatestQuery flattens any thrown error to a string, so AssetNotFoundError
// ("Asset not found: <id>") is told apart from a real failure the same way
// useOperationAsset already does, by matching the message text.
function isNotFound(message: string | null): boolean {
  return !!message && message.toLowerCase().includes("not found");
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
    void run(() => venue.getAsset(assetId), { clear: true });
  }, [assetId, reset, run, venue]);

  const notFound = isNotFound(error);
  return { asset, loading, error: notFound ? null : error, notFound };
}
