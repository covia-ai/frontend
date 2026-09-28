import { decodeJwtClaims } from "@/lib/identity-token";
import { browserSessionStorage } from "@/lib/persist-storage";

export const OAUTH_PROVIDERS = ["google", "microsoft", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  microsoft: "Microsoft",
  github: "GitHub",
};

export function parseOAuthProviders(loginHtml: string): OAuthProvider[] {
  const configured = new Set<OAuthProvider>();
  const hrefPattern = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(loginHtml)) !== null) {
    try {
      const pathname = new URL(match[1], "https://venue.invalid").pathname;
      const provider = /^\/auth\/(google|microsoft|github)\/?$/.exec(pathname)?.[1];
      if (provider) configured.add(provider as OAuthProvider);
    } catch {
      // Ignore malformed links from a non-conforming login page.
    }
  }

  return OAUTH_PROVIDERS.filter((provider) => configured.has(provider));
}

export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (value.startsWith("/auth/callback")) return fallback;
  return value;
}

const OAUTH_STATE_KEY = "oauth-state";

/**
 * The nonce this tab sends with every OAuth sign-in it starts, created on
 * first use. The callback only accepts a response that echoes it, so a crafted
 * `/auth/callback?token=…` link cannot sign the user into someone else's
 * account (login CSRF). Per-tab, because the redirect returns to the same tab.
 */
export function oauthState(): string {
  const storage = browserSessionStorage();
  let state = storage.getItem(OAUTH_STATE_KEY);
  if (!state) {
    // Not randomUUID: that needs a secure context, and a venue UI served over
    // plain HTTP on a LAN is a supported setup.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    storage.setItem(OAUTH_STATE_KEY, state);
  }
  return state;
}

export type OAuthCallback =
  | { status: "accepted"; venueId: string; token: string; did: string; returnTo: string }
  | { status: "rejected"; reason: string }
  // No token at all — someone opened the callback URL directly.
  | { status: "absent" };

/**
 * Validates the query string a venue redirected back with. The venue signs the
 * token and re-verifies it on every call; the checks here are about *filing*
 * it correctly — it answers a sign-in this tab started, for a venue the user
 * has connected, and the DID shown to the user is the one the token is for.
 */
export function readOAuthCallback(
  params: URLSearchParams,
  isKnownVenue: (venueId: string) => boolean,
): OAuthCallback {
  const token = params.get("token");
  if (!token) return { status: "absent" };

  const storage = browserSessionStorage();
  const expectedState = storage.getItem(OAUTH_STATE_KEY);
  // Single use: a replayed callback URL must not be accepted twice.
  storage.removeItem(OAUTH_STATE_KEY);
  if (!expectedState || params.get("state") !== expectedState) {
    return { status: "rejected", reason: "The response did not match a sign-in started from this tab." };
  }

  const venueId = params.get("venueId");
  if (!venueId || !isKnownVenue(venueId)) {
    return { status: "rejected", reason: "The response names a venue this browser is not connected to." };
  }

  const did = params.get("did");
  const claims = decodeJwtClaims(token);
  if (!did || claims?.sub !== did || claims?.iss !== venueId) {
    return { status: "rejected", reason: "The token does not belong to this venue and account." };
  }

  return { status: "accepted", venueId, token, did, returnTo: safeReturnTo(params.get("returnTo")) };
}

export function buildOAuthLoginUrl({
  baseUrl,
  provider,
  frontendOrigin,
  venueId,
  returnTo,
  state,
}: {
  baseUrl: string;
  provider: OAuthProvider;
  frontendOrigin: string;
  venueId: string;
  returnTo: string;
  state: string;
}): string {
  // The venue redirects back to this URL verbatim, appending `token` and
  // `did` — so whatever is set here is what the callback page receives.
  const callback = new URL("/auth/callback", frontendOrigin);
  callback.searchParams.set("venueId", venueId);
  callback.searchParams.set("returnTo", safeReturnTo(returnTo));
  callback.searchParams.set("state", state);

  const login = new URL(`/auth/${provider}`, `${baseUrl.replace(/\/$/, "")}/`);
  login.searchParams.set("redirect_uri", callback.toString());
  return login.toString();
}
