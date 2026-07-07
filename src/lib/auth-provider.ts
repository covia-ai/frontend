import { BearerAuth, Ed25519Auth, Auth } from "@covia/covia-sdk";
import type { VenueAuth } from "@/hooks/use-auth";

export function createAuthProvider(auth: VenueAuth | null): Auth | undefined {
  if (!auth) return undefined;
  if (auth.type === "bearer") return new BearerAuth(auth.token);
  if (auth.type === "keypair") return Ed25519Auth.fromHex(auth.privateKeyHex);
  return undefined;
}
