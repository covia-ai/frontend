import { test as base, expect, type Page, type Request, type Route } from "@playwright/test";
import { Ed25519Auth } from "@covia/covia-sdk";
import { seedConsent } from "./browser";

/**
 * A fake Covia venue served through Playwright request interception, so E2E
 * tests run without a Java venue and every test starts from known state.
 *
 * - The mock answers at MOCK_VENUE_URL, the local venue that non-production
 *   builds list by default (`src/hooks/use-venues.ts`).
 * - Every other origin except the app itself is refused as unreachable: the
 *   hosted default venues, analytics, fonts. Tests never touch the network.
 * - A venue request with no handler gets a 404 and is recorded in `unhandled`;
 *   the fixture fails the test if any are left, so a gap in the mock shows up
 *   instead of quietly changing what the page renders.
 *
 * Response shapes follow the venue's own code (covia `CoviaAPI`, `ApiErrors`)
 * and the SDK types. When the venue's API changes, change them here once.
 */

export const MOCK_VENUE_URL = "http://127.0.0.1:8080";
export const MOCK_VENUE_DID = "did:key:z6MkTestVenue0000000000000000000000000000000000";

// A fixed, test-only Ed25519 key: same DID every run, so assertions can name it.
export const TEST_DEVICE_KEY_HEX = "11".repeat(32);
export const TEST_USER_DID = Ed25519Auth.fromHex(TEST_DEVICE_KEY_HEX).getDID();

type Json = unknown;

const REPLY = Symbol("reply");
type Reply = {
  [REPLY]: true;
  status: number;
  body: string;
  contentType: string;
};

/** A handler's result: a JSON body (sent with 200), or a reply built with `problem`/`sse`. */
export type HandlerResult = Json | Reply;
export type Handler = (req: Request, url: URL) => HandlerResult | Promise<HandlerResult>;

/**
 * An error response as the venue sends it (covia `ApiErrors`): RFC 9457
 * problem details, whose `error` member repeats `detail`. The SDK takes the
 * message from `error`, so a body without it would test a venue that doesn't exist.
 */
export function problem(status: number, detail: string): Reply {
  const title = STATUS_TITLES[status] ?? "Error";
  return {
    [REPLY]: true,
    status,
    contentType: "application/problem+json",
    body: JSON.stringify({ title, status, detail, error: detail }),
  };
}

/** A complete Server-Sent Events stream: each value becomes one `data:` event. */
export function sse(...events: Json[]): Reply {
  return {
    [REPLY]: true,
    status: 200,
    contentType: "text/event-stream",
    body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
  };
}

const STATUS_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

function isReply(value: unknown): value is Reply {
  return typeof value === "object" && value !== null && REPLY in value;
}

/** `GET /api/v1/status`, as covia's CoviaAPI.getStatus returns it (checked against 0.10.1). */
export function statusBody(overrides: Record<string, Json> = {}) {
  return {
    status: "OK",
    did: MOCK_VENUE_DID,
    name: "Mock Venue",
    version: "0.10.0",
    url: MOCK_VENUE_URL,
    ts: 0, // epoch milliseconds, as the venue sends it
    ucanProfile: "0.10.0",
    stats: { assets: 0, users: 1, ops: 0, jobs: 0, userJobs: 0 },
    access: { public: true, userAutoCreate: true, publicCaps: "read-only" },
    ...overrides,
  };
}

/**
 * An operation's catalog entry: full inline asset metadata, as a venue stores
 * it under v/ops (shape from covia's `adapters/*.json` resources).
 */
export function operationMeta(
  name: string,
  adapter: string,
  input: Record<string, Json> = { type: "object", properties: {} },
  extra: Record<string, Json> = {},
) {
  return {
    name,
    description: `${name} (mock)`,
    operation: { adapter, input, output: { type: "object", properties: {} } },
    ...extra,
  };
}

/**
 * A job record, as `GET /api/v1/jobs/{id}` returns it (SDK `JobMetadata`;
 * shape checked against a 0.10.1 venue). `id` is "0x" + 32 hex digits; the
 * job list carries the same id without the prefix.
 */
export type JobRecord = {
  id: string;
  status: "PENDING" | "STARTED" | "COMPLETE" | "FAILED" | "CANCELLED" | string;
  op: string;
  input: Json;
  output?: Json;
  error?: string;
  /** Epoch milliseconds. */
  created: number;
  updated: number;
};

export type RecordedRequest = { method: string; path: string; search: string; body: Json };

export type MockVenue = {
  readonly url: string;
  /**
   * Mock one route. `path` matches the URL pathname: a string exactly, a
   * RegExp by test. The latest registration wins, so tests can override defaults.
   */
  on(method: string, path: string | RegExp, handler: Handler): void;
  /** Every request the app sent to the venue, in order. */
  readonly requests: RecordedRequest[];
  /** Venue requests no handler answered. Must be empty when the test ends. */
  readonly unhandled: RecordedRequest[];
  /** Requests that persist a job on a real venue: REST invoke or MCP tools/call. */
  invocations(): RecordedRequest[];
  /** Let requests to these paths go unhandled without failing the test. */
  allowUnhandled(path: string | RegExp): void;
  /**
   * Set the lattice served by `GET /api/v1/values/read?path=…`. Keys are
   * mount paths: `{ "v/ops": {...} }` makes `v/ops` and everything beneath it
   * readable. An absent path reads as `{exists:false}`, as on a real venue.
   */
  setValues(values: Record<string, Json>): void;
  /** Answer one MCP JSON-RPC method on `POST /mcp`. `tools/list` defaults to no tools. */
  onMcp(method: string, result: (params: Json) => Json): void;
  /**
   * How an invocation finishes. Defaults to COMPLETE with `{}` output; return
   * `{ status: "FAILED", error: "…" }` for a failed job. The job is stored and
   * served from `GET /api/v1/jobs/{id}` and its SSE stream.
   */
  onInvoke(finish: (op: string, input: Json) => Partial<JobRecord>): void;
  /** Jobs created so far, by id. */
  readonly jobs: Map<string, JobRecord>;
  /**
   * Start the page signed in to the mock venue with the fixed test device key,
   * by seeding the persisted `venue-auth` store. Call before `page.goto`.
   */
  signIn(): Promise<{ did: string }>;
};

async function installMockVenue(page: Page, appOrigin: string): Promise<MockVenue> {
  const handlers: { method: string; path: string | RegExp; handler: Handler }[] = [];
  const allowed: (string | RegExp)[] = [];
  const requests: RecordedRequest[] = [];
  const unhandled: RecordedRequest[] = [];
  const jobs = new Map<string, JobRecord>();
  const venueOrigin = new URL(MOCK_VENUE_URL).origin;
  let lattice: Record<string, Json> = {};
  const mcp = new Map<string, (params: Json) => Json>([["tools/list", () => ({ tools: [] })]]);
  let finish: (op: string, input: Json) => Partial<JobRecord> = () => ({ status: "COMPLETE", output: {} });

  const matchesPath = (pattern: string | RegExp, path: string) =>
    typeof pattern === "string" ? pattern === path : pattern.test(path);

  const venue: MockVenue = {
    url: MOCK_VENUE_URL,
    on(method, path, handler) {
      handlers.unshift({ method: method.toUpperCase(), path, handler });
    },
    requests,
    unhandled,
    invocations: () =>
      requests.filter(
        (r) =>
          r.method === "POST" &&
          (r.path === "/api/v1/invoke" ||
            (r.path === "/mcp" && (r.body as { method?: string } | null)?.method === "tools/call")),
      ),
    allowUnhandled(path) {
      allowed.push(path);
    },
    setValues(values) {
      lattice = {};
      for (const [path, value] of Object.entries(values)) {
        const keys = path.split("/").filter(Boolean);
        let node = lattice;
        for (const key of keys.slice(0, -1)) node = (node[key] ??= {}) as Record<string, Json>;
        node[keys[keys.length - 1]] = value;
      }
    },
    onMcp(method, result) {
      mcp.set(method, result);
    },
    onInvoke(next) {
      finish = next;
    },
    jobs,
    async signIn() {
      const auth = { type: "keypair", privateKeyHex: TEST_DEVICE_KEY_HEX, did: TEST_USER_DID };
      // useAuthStore's persist envelope (src/hooks/use-auth.ts, version 1),
      // keyed by venue DID as loginWithKeypair records it.
      const stored = JSON.stringify({
        state: {
          authMap: { [MOCK_VENUE_DID]: auth },
          accountsMap: { [MOCK_VENUE_DID]: [auth] },
          deviceKeyHex: TEST_DEVICE_KEY_HEX,
          deviceKeys: [TEST_DEVICE_KEY_HEX],
        },
        version: 1,
      });
      await page.addInitScript((value) => localStorage.setItem("venue-auth", value), stored);
      return { did: TEST_USER_DID };
    },
  };

  // ---- Defaults: what every page reads. Tests override with venue.on(...). ----

  venue.on("GET", "/api/v1/status", () => statusBody());
  venue.on("GET", "/api/v1/assets", () => ({ items: [], total: 0, offset: 0, limit: 100 }));
  // The caller's job ids, bare hex (no 0x), in the venue's page envelope.
  venue.on("GET", "/api/v1/jobs", () => {
    const items = [...jobs.keys()].map((id) => id.replace(/^0x/, ""));
    return { items, total: items.length, offset: 0, limit: items.length };
  });
  venue.on("GET", "/api/v1/secrets", () => ({ items: [] }));
  // No OAuth providers configured: a venue then serves no /login page.
  venue.on("GET", "/login", () => problem(404, "Not Found"));
  venue.on("GET", "/.well-known/mcp", () => ({ server_url: `${MOCK_VENUE_URL}/mcp` }));

  // Values API: job-free lattice reads.
  venue.on("GET", "/api/v1/values/read", (_req, url) => {
    let node: Json = lattice;
    for (const key of (url.searchParams.get("path") ?? "").split("/").filter(Boolean)) {
      if (!node || typeof node !== "object" || !(key in node)) return { exists: false };
      node = (node as Record<string, Json>)[key];
    }
    return { exists: true, value: node };
  });
  // Counts over a lattice collection (e.g. pending approvals under h/).
  venue.on("GET", "/api/v1/values/aggregate", () => ({ exists: false }));

  // MCP JSON-RPC.
  venue.on("POST", "/mcp", (req) => {
    const { id, method, params } = req.postDataJSON() as { id: Json; method: string; params: Json };
    const answer = mcp.get(method);
    return answer
      ? { jsonrpc: "2.0", id, result: answer(params) }
      : { jsonrpc: "2.0", id, error: { code: -32601, message: `mock venue: no MCP method ${method}` } };
  });

  // Jobs: invoke stores a record; the record is readable and streamable.
  venue.on("POST", "/api/v1/invoke", (req) => {
    const { operation, input } = req.postDataJSON() as { operation: string; input: Json };
    const now = Date.now();
    const id = "0x" + (jobs.size + 1).toString(16).padStart(32, "0");
    const job: JobRecord = { id, op: operation, input, created: now, updated: now, status: "COMPLETE", ...finish(operation, input) };
    jobs.set(id, job);
    return job;
  });
  // Accepts the id with or without its 0x prefix, as the venue does.
  const jobFor = (url: URL) => jobs.get("0x" + (url.pathname.split("/")[4] ?? "").replace(/^0x/, ""));
  venue.on("GET", /^\/api\/v1\/jobs\/(0x)?[0-9a-f]+$/, (_req, url) => jobFor(url) ?? problem(404, "Job not found"));
  venue.on("GET", /^\/api\/v1\/jobs\/(0x)?[0-9a-f]+\/sse$/, (_req, url) => {
    const job = jobFor(url);
    return job ? sse(job) : problem(404, "Job not found");
  });

  // ---- Routing ----

  await page.context().route(
    (url) => url.origin !== appOrigin,
    async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin !== venueOrigin) return route.abort("connectionrefused");

      const method = req.method();
      const headers = corsHeaders(req);
      // Cross-origin preflight: the venue allows any origin.
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers });

      const record: RecordedRequest = { method, path: url.pathname, search: url.search, body: bodyOf(req) };
      requests.push(record);

      const entry = handlers.find((h) => (h.method === "*" || h.method === method) && matchesPath(h.path, url.pathname));
      let result: HandlerResult;
      if (entry) {
        result = await entry.handler(req, url);
      } else {
        if (!allowed.some((p) => matchesPath(p, url.pathname))) unhandled.push(record);
        result = problem(404, `Endpoint ${method} ${url.pathname} not found (mock venue has no handler)`);
      }

      if (isReply(result)) {
        return route.fulfill({ status: result.status, headers, contentType: result.contentType, body: result.body });
      }
      return route.fulfill({ status: 200, headers, json: result });
    },
  );

  return venue;
}

function bodyOf(req: Request): Json {
  try {
    return req.postDataJSON();
  } catch {
    return req.postData();
  }
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    "access-control-allow-origin": req.headers()["origin"] ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": req.headers()["access-control-request-headers"] ?? "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

export const test = base.extend<{ venue: MockVenue }>({
  // The fixture callback is named `provide`, not Playwright's usual `use`, so
  // the React Hooks lint rule doesn't mistake it for React's use().
  venue: async ({ page, baseURL }, provide) => {
    await seedConsent(page);
    const venue = await installMockVenue(page, new URL(baseURL!).origin);
    await provide(venue);
    expect(venue.unhandled, "venue requests the mock has no handler for").toEqual([]);
  },
});

export { expect };
