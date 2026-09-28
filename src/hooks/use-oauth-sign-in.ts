"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useStoredValue } from "@/hooks/use-stored-value";
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

const NO_PROVIDERS: OAuthProvider[] = [];

export function useOAuthProviders(baseUrl?: string): OAuthProvider[] {
  // The answer is kept with the venue it is for, so a venue switch offers no
  // providers until the new venue has answered — never the previous venue's.
  const [answer, setAnswer] = useState<{ baseUrl: string; providers: OAuthProvider[] } | null>(null);

  useEffect(() => {
    if (!baseUrl) return;
    let active = true;
    void discoverOAuthProviders(baseUrl).then((providers) => {
      if (active) setAnswer({ baseUrl, providers });
    });
    return () => { active = false; };
  }, [baseUrl]);

  return answer && answer.baseUrl === baseUrl ? answer.providers : NO_PROVIDERS;
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
  const offersOAuth = providers.length > 0;
  // Browser-only inputs, read as the external state they are, so the server
  // and the first client render agree (no options until hydration). No nonce
  // is minted until a venue actually offers OAuth; `pathname` keeps the
  // return-to current across client navigations.
  const readRequest = useCallback(
    () =>
      offersOAuth
        ? {
            origin: window.location.origin,
            returnTo: `${pathname}${window.location.search}${window.location.hash}`,
            state: oauthState(),
          }
        : null,
    [offersOAuth, pathname],
  );
  const [request] = useStoredValue(readRequest);

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
