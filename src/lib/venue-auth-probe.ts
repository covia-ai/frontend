import { Ed25519Auth, fetchWithError, GridError, Venue } from "@covia/covia-sdk";

export type AuthProbeResult =
  | { ok: true }
  | { ok: false; kind: "rejected"; status: number; message: string }
  | { ok: false; kind: "unverified"; message: string };

// Permission-neutral, authenticated identity check: a raw, job-free GET of
// /api/v1/status with the credential. Status is a discovery route, which
// authenticates a presented credential and admits its user (401 for a bad
// credential, 403 for a user the venue does not admit) but checks no
// permission. Listings are no use for this since covia 0.11: GET
// /api/v1/agents needs crud/read on g/, and a credential without it gets 403
// though the venue accepts the account.
export async function verifyVenueAccount(venue: Venue): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  await venue.auth.apply(headers, venue.venueId);
  await fetchWithError(`${venue.baseUrl}/api/v1/status`, { headers });
}

// Checks whether a venue actually accepts a device key before the app commits
// to signing in with it — a stored key can be unknown to a venue that
// requires admission, and without this check the sign-in "succeeds" locally
// and every later call 403s. The probe is verifyVenueAccount above.
//
// Only a definite 401/403 counts as rejection. Anything else (network
// failure, older venue without the route) is "unverified" — the caller should
// proceed with the sign-in and warn, not lock the user out of an offline or
// old venue.
//
// A throwaway Venue instance is deliberate (normally forbidden — see
// AGENTS.md): the shared cached instance must not be created around
// credentials that may be about to be rejected.
export async function probeDeviceKeyAuth(
  baseUrl: string,
  venueId: string,
  privateKeyHex: string,
): Promise<AuthProbeResult> {
  try {
    const venue = new Venue({
      baseUrl,
      venueId,
      auth: Ed25519Auth.fromHex(privateKeyHex),
    });
    await verifyVenueAccount(venue);
    return { ok: true };
  } catch (err) {
    if (err instanceof GridError && (err.statusCode === 401 || err.statusCode === 403)) {
      return { ok: false, kind: "rejected", status: err.statusCode, message: err.message };
    }
    return {
      ok: false,
      kind: "unverified",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
