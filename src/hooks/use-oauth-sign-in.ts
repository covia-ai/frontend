"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useVenues } from "@/hooks/use-venues";
import {
  buildOAuthLoginUrl,
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
      .catch(() => []);
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
