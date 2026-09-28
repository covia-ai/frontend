import { Ed25519Auth } from "@covia/covia-sdk";
import type { VenueAuth } from "@/hooks/use-auth";

// Upper bound on a minted device-key token's lifetime. Venues can't revoke
// these JWTs yet (covia#197, #534), so a leaked token stays usable until it
// expires; 30 days bounds that window.
export const MAX_IDENTITY_TOKEN_LIFETIME_SECONDS = 2_592_000;

// Lifetimes offered when minting a device-key token. A minted JWT is a
// bearer credential — anyone holding it can act as this identity at the
// venue until it expires — so the long options deserve deliberate choice.
export const IDENTITY_TOKEN_LIFETIMES = [
  { seconds: 300, label: "5 minutes" },
  { seconds: 3_600, label: "1 hour" },
  { seconds: 86_400, label: "24 hours" },
  { seconds: MAX_IDENTITY_TOKEN_LIFETIME_SECONDS, label: "30 days" },
] as const;

/**
 * Produce a bearer-usable identity token for a stored account at a venue,
 * suitable for `Authorization: Bearer <token>` against that venue's API.
 *
 * - Device-key accounts mint a fresh EdDSA JWT via the SDK's
 *   `Ed25519Auth.identityToken`, with `aud` bound to the venue DID so the
 *   token cannot be replayed at another venue, and the requested lifetime.
 *   Throws a RangeError above MAX_IDENTITY_TOKEN_LIFETIME_SECONDS.
 * - OAuth accounts return their stored bearer token unchanged (its lifetime
 *   is whatever the venue issued; `lifetimeSeconds` is ignored).
 */
export function identityTokenFor(
  auth: VenueAuth,
  venueDid: string,
  lifetimeSeconds = 300,
): string {
  if (auth.type === "bearer") return auth.token;
  if (lifetimeSeconds > MAX_IDENTITY_TOKEN_LIFETIME_SECONDS) {
    throw new RangeError("Identity token lifetime cannot exceed 30 days");
  }
  return Ed25519Auth.fromHex(auth.privateKeyHex).identityToken(venueDid, lifetimeSeconds);
}

/**
 * Reads the claims out of a venue-issued JWT without verifying its signature.
 *
 * NOT AUTHENTICATION. The venue signs these tokens and verifies them on every
 * call; nothing here may be used to make a trust decision. This exists so the
 * client can read non-security claims it already holds, such as the `email`
 * the venue puts in the token after an OAuth sign-in.
 *
 * Returns null for anything that is not a readable JWT payload, so callers can
 * treat a bearer token from an older venue, or a device-key account, as simply
 * having no claims.
 */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    // base64url → base64, restoring the padding the encoding strips.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    // Claims may hold non-ASCII (a name, or an internationalised address), so
    // decode as UTF-8 rather than trusting atob's latin1 output.
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return claims && typeof claims === "object" && !Array.isArray(claims)
      ? (claims as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
