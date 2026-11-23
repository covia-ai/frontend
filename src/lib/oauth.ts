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
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u0020\u007f]/.test(value)) {
    return fallback;
  }
  if (value.startsWith("/auth/callback")) return fallback;
  return value;
}

// Only the pending ceremony survives navigation. Credentials never go here.
const TRANSACTION_KEY = "oauth-transaction";
const TRANSACTION_TTL_MS = 5 * 60_000;
export const OAUTH_ERROR = {
  start: "Sign-in requires HTTPS (or localhost) and available tab storage.",
  transaction: "The response did not match a current sign-in started from this tab.",
  venue: "The venue for this sign-in is no longer connected at the same address.",
  exchange: "The sign-in exchange failed or expired. Please start again.",
  credential: "The token does not belong to this venue and account.",
} as const;

type Transaction = {
  state: string;
  verifier: string;
  venueId: string;
  baseUrl: string;
  redirectUri: string;
  returnTo: string;
  expiresAt: number;
};

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function secureUrl(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash ||
      !(url.protocol === "https:" || (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error(OAUTH_ERROR.start);
  }
  return url;
}

/** Start on an explicit click, with a fresh per-tab transaction and S256 PKCE. */
export async function buildOAuthLoginUrl({ baseUrl, provider, frontendOrigin, venueId, returnTo }: {
  baseUrl: string;
  provider: OAuthProvider;
  frontendOrigin: string;
  venueId: string;
  returnTo: string;
}): Promise<string> {
  try {
    const venue = secureUrl(baseUrl);
    const redirectUri = new URL("/auth/callback", secureUrl(frontendOrigin)).href;
    const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    const transaction: Transaction = {
      state, verifier, venueId, baseUrl: venue.href, redirectUri,
      returnTo: safeReturnTo(returnTo), expiresAt: Date.now() + TRANSACTION_TTL_MS,
    };
    const storage = browserSessionStorage();
    const serialized = JSON.stringify(transaction);
    storage.setItem(TRANSACTION_KEY, serialized);
    if (storage.getItem(TRANSACTION_KEY) !== serialized) throw new Error(OAUTH_ERROR.start);
    const login = new URL(`/auth/${provider}`, venue);
    login.search = new URLSearchParams({
      redirect_uri: redirectUri, state, code_challenge: challenge, code_challenge_method: "S256",
    }).toString();
    return login.href;
  } catch {
    throw new Error(OAUTH_ERROR.start);
  }
}

export type OAuthCallback =
  | { status: "accepted"; venueId: string; token: string; did: string; returnTo: string }
  | { status: "rejected"; reason: string }
  | { status: "absent" };

/** Consume once before exchange. The destination and account scope come from
 * this tab's saved request, never callback parameters. Signature verification
 * remains the venue's job; decoded claims only check credential/account filing.
 */
export async function readOAuthCallback(
  params: URLSearchParams,
  venueBaseUrl: (venueId: string) => string | undefined,
): Promise<OAuthCallback> {
  if (params.size === 0) return { status: "absent" };
  const rejected = (reason: string): OAuthCallback => ({ status: "rejected", reason });
  let transaction: Transaction;
  try {
    const storage = browserSessionStorage();
    const saved = storage.getItem(TRANSACTION_KEY);
    storage.removeItem(TRANSACTION_KEY);
    transaction = JSON.parse(saved ?? "null");
    if (!transaction || params.has("token") || params.has("error") ||
        params.getAll("code").length !== 1 || !params.get("code") ||
        params.getAll("state").length !== 1 || params.get("state") !== transaction.state ||
        !Number.isFinite(transaction.expiresAt) || transaction.expiresAt <= Date.now() ||
        transaction.redirectUri !== new URL("/auth/callback", window.location.origin).href) {
      return rejected(OAUTH_ERROR.transaction);
    }
    const current = venueBaseUrl(transaction.venueId);
    if (!current || secureUrl(current).href !== transaction.baseUrl) return rejected(OAUTH_ERROR.venue);
  } catch {
    return rejected(OAUTH_ERROR.transaction);
  }
  try {
    const response = await fetch(new URL("/auth/exchange", transaction.baseUrl), {
      method: "POST", credentials: "omit", cache: "no-store", redirect: "error",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        code: params.get("code")!, code_verifier: transaction.verifier, redirect_uri: transaction.redirectUri,
      }),
    });
    if (!response.ok) return rejected(OAUTH_ERROR.exchange);
    const { token, did } = await response.json();
    const claims = typeof token === "string" ? decodeJwtClaims(token) : null;
    if (typeof did !== "string" || !did || claims?.sub !== did || claims?.iss !== transaction.venueId) {
      return rejected(OAUTH_ERROR.credential);
    }
    return { status: "accepted", venueId: transaction.venueId, token, did, returnTo: safeReturnTo(transaction.returnTo) };
  } catch {
    // Never persist a provider response, code, verifier or token in notifications.
    return rejected(OAUTH_ERROR.exchange);
  }
}
