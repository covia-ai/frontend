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

export function buildOAuthLoginUrl({
  baseUrl,
  provider,
  frontendOrigin,
  venueId,
  returnTo,
}: {
  baseUrl: string;
  provider: OAuthProvider;
  frontendOrigin: string;
  venueId: string;
  returnTo: string;
}): string {
  const callback = new URL("/auth/callback", frontendOrigin);
  callback.searchParams.set("venueId", venueId);
  callback.searchParams.set("returnTo", safeReturnTo(returnTo));

  const login = new URL(`/auth/${provider}`, `${baseUrl.replace(/\/$/, "")}/`);
  login.searchParams.set("redirect_uri", callback.toString());
  return login.toString();
}
