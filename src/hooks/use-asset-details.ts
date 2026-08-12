"use client";

import { useEffect } from "react";
import type { Asset, Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { isNotFoundError } from "@/lib/errors";

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

  const notFound = isNotFoundError(error);
  return { asset, loading, error: notFound ? null : error, notFound };
}
