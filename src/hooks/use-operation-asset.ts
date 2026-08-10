"use client";

import { useEffect, useState } from "react";
import type { Asset, Venue } from "@covia/covia-sdk";
import { resolveOperationByAddress } from "@/lib/operations-catalog";

type OperationAssetState = {
  asset?: Asset;
  errorMessage: string;
  notFound: boolean;
  loading: boolean;
};

export function useOperationAsset(
  venue: Venue | undefined,
  assetId: string,
): OperationAssetState {
  const [state, setState] = useState<OperationAssetState>({
    errorMessage: "",
    notFound: false,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    setState({ errorMessage: "", notFound: false, loading: true });
    // Stays loading while waiting on the venue — there's nothing to resolve
    // against yet, not a resolved-and-empty state.
    if (!venue) return () => {
      active = false;
    };

    void resolveOperationByAddress(venue, assetId)
      .then((asset) => {
        if (active) setState({ asset, errorMessage: "", notFound: false, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Failed to load asset";
        const notFound =
          message.includes("404") || message.toLowerCase().includes("not found");
        setState({
          errorMessage: notFound ? "" : message,
          notFound,
          loading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [assetId, venue]);

  return state;
}
