import { Ed25519Auth, GridError, Venue } from "@covia/covia-sdk";

export type AuthProbeResult =
  | { ok: true }
  | { ok: false; kind: "rejected"; status: number; message: string }
  | { ok: false; kind: "unverified"; message: string };

// Checks whether a venue actually accepts a device key before the app commits
// to signing in with it — a stored key can be unknown to a venue that
// requires admission, and without this check the sign-in "succeeds" locally
// and every later call 403s. The probe is secrets.list: an authenticated,
// job-free GET the venue only serves to accepted callers.
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
    await venue.secrets.list();
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
