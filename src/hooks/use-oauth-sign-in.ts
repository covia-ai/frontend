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

/**
 * How long an "this venue advertises no providers" answer is trusted before we
 * ask again. A venue serves no `/login` at all until an operator configures a
 * provider, so an empty answer is a statement about today's deployment, not a
 * fact about the venue — see covia-ai/frontend#394.
 */
export const EMPTY_DISCOVERY_TTL_MS = 30_000;

type DiscoveryEntry = {
  request: Promise<OAuthProvider[]>;
  /** Epoch ms the entry stops being trusted; Infinity once providers are found. */
  expiresAt: number;
};

const providerRequests = new Map<string, DiscoveryEntry>();

function probeProviders(normalized: string): Promise<OAuthProvider[]> {
  return fetch(`${normalized}/login`, {
    method: "GET",
    headers: { Accept: "text/html" },
    credentials: "omit",
  })
    .then((response) => response.ok ? response.text() : "")
    .then(parseOAuthProviders);
}

export function discoverOAuthProviders(baseUrl: string): Promise<OAuthProvider[]> {
  const normalized = baseUrl.replace(/\/$/, "");
  const cached = providerRequests.get(normalized);
  if (cached && Date.now() < cached.expiresAt) return cached.request;

  // Hold concurrent callers to one probe, then trust the answer only for as
  // long as it deserves. Providers found: for good. None advertised: for the
  // TTL, since caching that for the life of the tab would hide SSO from anyone
  // whose tab predates the operator turning it on. No reply at all: not at
  // all — that is not an answer, and a transient network failure must not
  // hide the buttons until the page is reloaded.
  const probe = probeProviders(normalized);
  const entry: DiscoveryEntry = {
    request: probe.catch((): OAuthProvider[] => []),
    expiresAt: Number.POSITIVE_INFINITY,
  };
  providerRequests.set(normalized, entry);
  void probe.then(
    (providers) => {
      if (providers.length === 0) entry.expiresAt = Date.now() + EMPTY_DISCOVERY_TTL_MS;
    },
    () => {
      providerRequests.delete(normalized);
    },
  );
  return entry.request;
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
