"use client";

import type { Venue } from "@covia/covia-sdk";
import { useVenueRead } from "@/hooks/use-venue-read";

// The venue landing and McpConnectSection both need the venue's MCP server URL
// from /.well-known/mcp — and both render on the landing page, so the naive two
// `fetch`es fired it twice per load. Memoise the discovery per baseUrl (mirrors
// use-oauth-sign-in's discoverOAuthProviders) so both consumers share one
// request. Resolves to the server_url, or a human status string on absence.
const requests = new Map<string, Promise<string>>();

export function discoverMcpUrl(baseUrl: string): Promise<string> {
  const normalized = baseUrl.replace(/\/$/, "");
  let request = requests.get(normalized);
  if (!request) {
    request = fetch(`${normalized}/.well-known/mcp`)
      .then((response) => {
        if (!response.ok) throw new Error(`MCP discovery failed: ${response.status}`);
        return response.json();
      })
      .then((body) => (body?.error ? "Not Available" : (body?.server_url ?? "Not Available")))
      .catch(() => {
        // Share a failure with whoever is asking right now, but don't keep it:
        // one dropped request must not hide the venue's MCP URL until reload.
        requests.delete(normalized);
        return "Not Available";
      });
    requests.set(normalized, request);
  }
  return request;
}

// Test-only: clear the per-baseUrl memo so cases with different fetch mocks for
// the same venue don't leak results into one another.
export function resetMcpDiscoveryCache(): void {
  requests.clear();
}

// The resolved MCP URL for a venue ("Not Found" until it loads, then the
// server_url or "Not Available"). Shared per baseUrl, so a page mounting two
// consumers still makes one discovery request. The answer is held with the
// venue it is for, so after a venue switch a Copy button can never hand over
// the previous venue's URL. discoverMcpUrl never rejects, so there is no
// failure for useVenueRead to report or recheck.
export function useMcpDiscovery(venue: Venue | null | undefined): string {
  return useVenueRead({
    venue,
    initial: "Not Found",
    notify: false,
    failureTitle: "Unable to discover the MCP server",
    load: (target) => discoverMcpUrl(target.baseUrl),
  }).data;
}
