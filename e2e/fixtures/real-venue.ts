import { test as base, expect, type Page } from "@playwright/test";
import {
  Ed25519Auth,
  generateKeyPair,
  privateKeyToHex,
  Venue,
  type StatusData,
} from "@covia/covia-sdk";
import { seedConsent } from "./browser";

/**
 * Fixtures for tests against a real, running Covia venue: the full stack,
 * nothing mocked. Start one first, from the covia repo:
 *
 *   java -jar venue/target/covia.jar local-dev.json
 *
 * The venue must be at REAL_VENUE_URL, the local venue non-production builds
 * connect to by default. Every other origin is refused, so the app can't fall
 * back to a hosted venue (venue-test.covia.ai is otherwise listed too, and
 * would be selected first).
 *
 * Each test gets its own fresh device key, so each runs as a new user: the
 * venue must auto-create users (`users.autoCreate`, on in local-dev.json).
 * Jobs are per user, so tests never see each other's jobs and can run in
 * parallel against one venue.
 *
 * With no venue reachable these tests skip, unless E2E_REQUIRE_VENUE is set
 * (as `pnpm test:e2e:venue` does), when they fail instead.
 */

export const REAL_VENUE_URL = "http://127.0.0.1:8080";

export type TestUser = {
  /** Private key, hex: what the app stores for a device key. */
  keyHex: string;
  did: string;
  /** An SDK client signed in as this user, to check venue-side state. */
  api: Venue;
};

type Fixtures = {
  /** The venue's `GET /api/v1/status`. */
  venueStatus: StatusData;
  /** A new user on the venue, with a key no other test uses. */
  user: TestUser;
  /** Open the app already signed in as `user`. Call before `page.goto`. */
  signIn: () => Promise<TestUser>;
};

async function fetchStatus(): Promise<StatusData | null> {
  try {
    const response = await fetch(`${REAL_VENUE_URL}/api/v1/status`, { signal: AbortSignal.timeout(3_000) });
    return response.ok ? ((await response.json()) as StatusData) : null;
  } catch {
    return null;
  }
}

/** Refuse every origin except the app and the venue under test. */
async function confineToVenue(page: Page, appOrigin: string) {
  const venueOrigin = new URL(REAL_VENUE_URL).origin;
  await page
    .context()
    .route(
      (url) => url.origin !== appOrigin && url.origin !== venueOrigin,
      (route) => route.abort("connectionrefused"),
    );
}

export const test = base.extend<Fixtures>({
  // Callbacks are named `provide`, not Playwright's usual `use`, so the React
  // Hooks lint rule doesn't mistake them for React's use().
  venueStatus: async ({}, provide) => {
    const status = await fetchStatus();
    if (!status) {
      const message =
        `No Covia venue at ${REAL_VENUE_URL}. Start one from the covia repo: ` +
        "java -jar venue/target/covia.jar local-dev.json";
      if (process.env.E2E_REQUIRE_VENUE) throw new Error(message);
      test.skip(true, message);
    }
    await provide(status!);
  },

  page: async ({ page, baseURL, venueStatus }, provide) => {
    void venueStatus; // a page is only useful once the venue is known to be up
    await seedConsent(page);
    await confineToVenue(page, new URL(baseURL!).origin);
    await provide(page);
  },

  user: async ({ venueStatus }, provide) => {
    void venueStatus;
    const keyHex = privateKeyToHex(generateKeyPair().privateKey);
    const auth = Ed25519Auth.fromHex(keyHex);
    const api = await Venue.connect(REAL_VENUE_URL, auth);
    await provide({ keyHex, did: auth.getDID(), api });
  },

  signIn: async ({ page, user, venueStatus }, provide) => {
    await provide(async () => {
      const auth = { type: "keypair", privateKeyHex: user.keyHex, did: user.did };
      const venueId = venueStatus.did!;
      // useAuthStore's persist envelope (src/hooks/use-auth.ts, version 1),
      // keyed by venue DID as loginWithKeypair records it.
      const stored = JSON.stringify({
        state: {
          authMap: { [venueId]: auth },
          accountsMap: { [venueId]: [auth] },
          deviceKeyHex: user.keyHex,
          deviceKeys: [user.keyHex],
        },
        version: 1,
      });
      await page.addInitScript((value) => localStorage.setItem("venue-auth", value), stored);
      return user;
    });
  },
});

/** The ids of the user's jobs on the venue, as the SDK lists them. */
export async function jobIds(user: TestUser): Promise<string[]> {
  return user.api.jobs.list();
}

export { expect };
