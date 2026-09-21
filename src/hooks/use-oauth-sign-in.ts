"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import {
  buildOAuthLoginUrl,
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
    .then(parseOAuthProviders)
    .catch((): OAuthProvider[] => []);
}

export function discoverOAuthProviders(baseUrl: string): Promise<OAuthProvider[]> {
  const normalized = baseUrl.replace(/\/$/, "");
  const cached = providerRequests.get(normalized);
  if (cached && Date.now() < cached.expiresAt) return cached.request;

  // Hold concurrent callers to one probe, then keep the answer only if the
  // venue actually advertised something. Caching an empty answer for the life
  // of the tab would hide SSO from anyone whose tab predates the operator
  // turning it on.
  const request = probeProviders(normalized);
  const entry: DiscoveryEntry = { request, expiresAt: Number.POSITIVE_INFINITY };
  providerRequests.set(normalized, entry);
  void request.then((providers) => {
    if (providers.length === 0) entry.expiresAt = Date.now() + EMPTY_DISCOVERY_TTL_MS;
  });
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
  const [location, setLocation] = useState<{ origin: string; returnTo: string } | null>(null);

  useEffect(() => {
    setLocation({
      origin: window.location.origin,
      returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
  }, [pathname]);

  return useMemo(() => {
    if (!baseUrl || !targetVenueId || !location) return [];
    return providers.map((provider) => ({
      provider,
      href: buildOAuthLoginUrl({
        baseUrl,
        provider,
        frontendOrigin: location.origin,
        venueId: targetVenueId,
        returnTo: location.returnTo,
      }),
    }));
  }, [baseUrl, location, providers, targetVenueId]);
}
