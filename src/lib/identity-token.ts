import { Ed25519Auth } from "@covia/covia-sdk";
import type { VenueAuth } from "@/hooks/use-auth";

// Lifetimes offered when minting a device-key token. A minted JWT is a
// bearer credential — anyone holding it can act as this identity at the
// venue until it expires — so the long options deserve deliberate choice.
export const IDENTITY_TOKEN_LIFETIMES = [
  { seconds: 300, label: "5 minutes" },
  { seconds: 3_600, label: "1 hour" },
  { seconds: 86_400, label: "24 hours" },
  { seconds: 2_592_000, label: "30 days" },
  { seconds: 31_536_000, label: "1 year" },
] as const;

/**
 * Produce a bearer-usable identity token for a stored account at a venue,
 * suitable for `Authorization: Bearer <token>` against that venue's API.
 *
 * - Device-key accounts mint a fresh EdDSA JWT via the SDK's
 *   `Ed25519Auth.identityToken`, with `aud` bound to the venue DID so the
 *   token cannot be replayed at another venue, and the requested lifetime.
 * - OAuth accounts return their stored bearer token unchanged (its lifetime
 *   is whatever the venue issued; `lifetimeSeconds` is ignored).
 */
export function identityTokenFor(
  auth: VenueAuth,
  venueDid: string,
  lifetimeSeconds = 300,
): string {
  if (auth.type === "bearer") return auth.token;
  return Ed25519Auth.fromHex(auth.privateKeyHex).identityToken(venueDid, lifetimeSeconds);
}
