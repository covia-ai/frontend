"use client";

import { useEffect } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import {
  fallbackModelOptions,
  modelCatalogPath,
  readModelOptions,
  type ModelOptions,
} from "@/lib/venue-models";

type Outcome = {
  venue: Venue | null;
  providerId: string;
  options: ModelOptions | null;
};

/**
 * The models to offer for a provider: the venue's own catalogue when it
 * publishes one, else the curated list. The answer is stored with the venue
 * and provider it is for, so after a provider switch the picker shows the
 * curated list until the new read lands, never the previous provider's
 * models. A failed read is quiet: the curated list is still a usable answer.
 */
export function useModelOptions(
  venue: Venue | null | undefined,
  providerId: string,
): ModelOptions {
  const { data: outcome, run, invalidate } = useLatestQuery<Outcome>({
    venue: null,
    providerId: "",
    options: null,
  });

  useEffect(() => {
    if (!venue || !modelCatalogPath(providerId)) {
      invalidate();
      return;
    }
    void run(async () => ({
      venue,
      providerId,
      options: await readModelOptions(venue, providerId).catch(() => null),
    }));
  }, [venue, providerId, run, invalidate]);

  const answered = outcome.venue === venue && outcome.providerId === providerId;
  return (answered && outcome.options) || fallbackModelOptions(providerId);
}
