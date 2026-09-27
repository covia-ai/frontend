// Seed a LOCAL Covia venue with a realistic user population for exercising the
// Users page end to end: many external users (plain DIDs), plus a few
// venue-managed named accounts (did:web:<venue>:u:<name>), each with an initial
// authenticator so the drill-down + revoke path has data.
//
// External users register on first authenticated request (auto-create).
// Managed accounts are minted by invoking v/ops/user/create with VENUE-OWNER
// authority — so this script signs its admin calls with the venue's own key
// (dev/venue.key), which is what makes the caller the venue operator.
//
// Usage (defaults target the local 4E venue on :8090):
//   node scripts/seed-local-users.mjs
//   EXTERNAL=22 MANAGED=alice,bob,carol,dave node scripts/seed-local-users.mjs
//   VENUE_BASE_URL=http://localhost:8090 \
//   VENUE_ID=did:key:z6MkuY4wdDPXQDnh9WHABHMdywmzREQwjqaHDtFdMXcxRHLu \
//   OWNER_KEY_FILE=/Users/cc/covia/covia-repo/dev/venue.key \
//   node scripts/seed-local-users.mjs

import { readFileSync } from "node:fs";
import {
  Venue,
  Ed25519Auth,
  generateKeyPair,
  privateKeyToHex,
  didFor,
  fetchWithError,
} from "@covia/covia-sdk";

const BASE = process.env.VENUE_BASE_URL ?? "http://localhost:8090";
const VID =
  process.env.VENUE_ID ??
  "did:key:z6MkuY4wdDPXQDnh9WHABHMdywmzREQwjqaHDtFdMXcxRHLu";
const OWNER_KEY_FILE =
  process.env.OWNER_KEY_FILE ?? "/Users/cc/covia/covia-repo/dev/venue.key";
const EXTERNAL = Number(process.env.EXTERNAL ?? 22);
const MANAGED = (process.env.MANAGED ?? "alice,bob,carol,dave")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ownerHex = readFileSync(OWNER_KEY_FILE, "utf8").trim();
const venue = new Venue({
  baseUrl: BASE,
  venueId: VID,
  auth: Ed25519Auth.fromHex(ownerHex),
});

// Each fresh DID makes one authenticated, job-free GET — the auto-create trip.
async function seedExternals(n) {
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const { privateKey } = generateKeyPair();
    const did = didFor(privateKey);
    const auth = Ed25519Auth.fromHex(privateKeyToHex(privateKey));
    const headers = { "Content-Type": "application/json" };
    auth.apply(headers, VID);
    await fetchWithError(`${BASE}/api/v1/agents?includeTerminated=false`, { headers });
    ok++;
    console.log(`  external  ${did}`);
  }
  return ok;
}

// Owner-authorised: mint a managed did:web account, seeded with one authenticator
// (a throwaway did:key) so the row's authenticator list + revoke has something.
async function createManaged(name) {
  const { privateKey } = generateKeyPair();
  const authDid = didFor(privateKey);
  const res = await venue.operations.run("v/ops/user/create", {
    username: name,
    authenticationKeys: [authDid],
  });
  console.log(`  managed   ${name}  (auth ${authDid.slice(0, 24)}…)  ${JSON.stringify(res)}`);
  return { name, authDid };
}

async function main() {
  console.log(`Seeding ${BASE}`);
  console.log(`Venue:  ${VID}`);
  console.log(`Owner:  ${OWNER_KEY_FILE}\n`);

  console.log(`Managed accounts (${MANAGED.length}):`);
  for (const name of MANAGED) {
    try {
      await createManaged(name);
    } catch (err) {
      console.error(`  managed   ${name}  FAILED: ${err?.message ?? err}`);
    }
  }

  console.log(`\nExternal users (${EXTERNAL}):`);
  const externals = await seedExternals(EXTERNAL);

  // Verify by listing as the operator.
  const list = await venue.users.list();
  const users = list.users ?? [];
  const managedCount = users.filter((u) => u.managed).length;
  console.log(
    `\nDone. Venue now lists ${users.length} users ` +
      `(${managedCount} managed, ${users.length - managedCount} external). ` +
      `Seeded ${externals} externals this run.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
