// Seed a Covia venue with N throwaway "external" users, for exercising the
// Users page (facet filter, pagination, per-row account-type chip) against real
// rows.
//
// HOW IT WORKS — there is no create-user API. A DID becomes a *registered
// external user* the first time it makes an authenticated request to a venue
// whose admission policy is auto-create (venue-test is: "New users are admitted
// automatically on first sign-in"). So for each user we generate a fresh
// Ed25519 device key and make one authenticated, job-free GET
// (/api/v1/agents) — exactly what the app's sign-in probe does
// (src/lib/venue-auth-probe.ts). That registers the DID.
//
// This can only ever create EXTERNAL users. *Managed* named accounts
// (managed: true, the ones with authenticators to revoke) are minted venue-side
// by the operator and are not reachable from the JS SDK.
//
// Usage:
//   node scripts/seed-venue-users.mjs [count]
//   COUNT=12 node scripts/seed-venue-users.mjs
//   VENUE_BASE_URL=https://venue-test.covia.ai VENUE_ID=did:key:... node scripts/seed-venue-users.mjs 8
//   node scripts/seed-venue-users.mjs 8 --save-keys   # also write the private keys to scripts/seeded-users.json
//
// The generated identities are throwaway keys for a scratch test venue. With
// --save-keys their private keys are written to scripts/seeded-users.json
// (untracked — do not commit); by default only the DIDs are saved.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Ed25519Auth,
  didFor,
  fetchWithError,
  generateKeyPair,
  privateKeyToHex,
} from "@covia/covia-sdk";

const here = dirname(fileURLToPath(import.meta.url));

// venue-test defaults; override with env or edit here.
const BASE_URL = process.env.VENUE_BASE_URL ?? "https://venue-test.covia.ai";
const VENUE_ID =
  process.env.VENUE_ID ??
  "did:key:z6MkiTgtfq3Rz6yvmYrx13FTWeLN2MAaRBteNhng8GJAMzLP";

const args = process.argv.slice(2);
const saveKeys = args.includes("--save-keys");
const countArg = args.find((a) => /^\d+$/.test(a));
const COUNT = Number(process.env.COUNT ?? countArg ?? 8);

// The same authenticated, job-free GET the sign-in probe uses. A read the venue
// only serves to accepted callers, and touching it is what trips auto-create.
async function registerDid(privateKeyHex) {
  const auth = Ed25519Auth.fromHex(privateKeyHex);
  const headers = { "Content-Type": "application/json" };
  auth.apply(headers, VENUE_ID);
  await fetchWithError(`${BASE_URL}/api/v1/agents?includeTerminated=false`, {
    headers,
  });
}

async function main() {
  console.log(`Seeding ${COUNT} external user(s) on ${BASE_URL}`);
  console.log(`Venue: ${VENUE_ID}\n`);

  const seeded = [];
  let ok = 0;
  let rejected = 0;

  for (let i = 0; i < COUNT; i++) {
    const { privateKey } = generateKeyPair();
    const privateKeyHex = privateKeyToHex(privateKey);
    const did = didFor(privateKey);
    try {
      await registerDid(privateKeyHex);
      ok++;
      seeded.push({ did, privateKeyHex });
      console.log(`  [${String(i + 1).padStart(2)}/${COUNT}] registered  ${did}`);
    } catch (err) {
      const status = err?.statusCode ?? err?.status;
      if (status === 401 || status === 403) {
        rejected++;
        console.log(
          `  [${String(i + 1).padStart(2)}/${COUNT}] REJECTED ${status} ${did}`,
        );
        console.error(
          `\nVenue rejected the key (HTTP ${status}). This venue is not auto-create — ` +
            `new DIDs must be admitted by the operator first. Nothing more to seed here.`,
        );
        break;
      }
      console.log(`  [${String(i + 1).padStart(2)}/${COUNT}] ERROR       ${did}`);
      console.error(`      ${err?.message ?? err}`);
    }
  }

  console.log(`\nDone: ${ok} registered, ${rejected} rejected.`);

  if (seeded.length > 0) {
    const outFile = join(here, "seeded-users.json");
    const payload = seeded.map((u) =>
      saveKeys ? u : { did: u.did },
    );
    writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n");
    console.log(
      `Wrote ${payload.length} ${saveKeys ? "identities (with private keys)" : "DIDs"} to ${outFile}` +
        (saveKeys ? " — untracked, do not commit." : "."),
    );
  }

  if (ok > 0) {
    console.log(
      `\nOpen the Users page as the venue operator to see them — they list as "External".`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
