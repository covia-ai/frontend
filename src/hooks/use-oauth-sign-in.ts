"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import {
  buildOAuthLoginUrl,
  oauthState,
  parseOAuthProviders,
  type OAuthProvider,
} from "@/lib/oauth";

const providerRequests = new Map<string, Promise<OAuthProvider[]>>();

export function discoverOAuthProviders(baseUrl: string): Promise<OAuthProvider[]> {
  const normalized = baseUrl.replace(/\/$/, "");
  let request = providerRequests.get(normalized);
  if (!request) {
    request = fetch(`${normalized}/login`, {
      method: "GET",
      headers: { Accept: "text/html" },
      credentials: "omit",
    })
      .then((response) => response.ok ? response.text() : "")
      .then(parseOAuthProviders)
      .catch(() => {
        // Only an answer is worth caching: a transient network failure would
        // otherwise hide the OAuth buttons until the page is reloaded.
        providerRequests.delete(normalized);
        return [];
      });
    providerRequests.set(normalized, request);
  }
  return request;
}

export function useOAuthProviders(baseUrl?: string): OAuthProvider[] {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    let active = true;
    setProviders([]);
    if (!baseUrl) return () => { active = false; };

    void discoverOAuthProviders(baseUrl).then((available) => {
      if (active) setProviders(available);
    });
    return () => { active = false; };
  }, [baseUrl]);

  return providers;
}

export type OAuthSignInOption = {
  provider: OAuthProvider;
  href: string;
};

export function useOAuthSignInOptions(venueId?: string): OAuthSignInOption[] {
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const targetVenueId = venueId ?? selectedVenueId ?? undefined;
  const baseUrl = useVenues((state) =>
    targetVenueId
      ? state.venues.find((venue) => venue.venueId === targetVenueId)?.baseUrl
      : undefined,
  );
  const providers = useOAuthProviders(baseUrl);
  const pathname = usePathname();
  // Browser-only inputs, read in an effect so server and first client render agree.
  const [request, setRequest] = useState<{ origin: string; returnTo: string; state: string } | null>(null);

  useEffect(() => {
    // No nonce is minted until a venue actually offers OAuth.
    if (providers.length === 0) return;
    setRequest({
      origin: window.location.origin,
      returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      state: oauthState(),
    });
  }, [pathname, providers]);

  return useMemo(() => {
    if (!baseUrl || !targetVenueId || !request) return [];
    return providers.map((provider) => ({
      provider,
      href: buildOAuthLoginUrl({
        baseUrl,
        provider,
        frontendOrigin: request.origin,
        venueId: targetVenueId,
        returnTo: request.returnTo,
        state: request.state,
      }),
    }));
  }, [baseUrl, request, providers, targetVenueId]);
}
