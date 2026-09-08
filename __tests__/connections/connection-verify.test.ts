import { CONNECTIONS, connectionSecrets } from "@/config/connections";
import type { ConnectionService } from "@/config/connections";
import { buildVerifyCall, interpretVerify } from "@/lib/connection-verify";
import { VERIFY_FIXTURES as FIXTURES } from "./connection-fixtures";

const verifiable = CONNECTIONS.filter((s) => s.verify);

describe("connection catalogue integrity", () => {
  it("every connector's id, skillId, secretName and auth mode line up", () => {
    for (const s of CONNECTIONS) {
      expect(s.skillId).toBe(`connections/${s.id}`);
      expect(s.secretName).toMatch(/^[A-Z0-9_]+$/);
      expect(["bearer", "header", "url"]).toContain(s.auth);
      expect(s.name).toBeTruthy();
    }
  });

  it("every verifiable connector has a test fixture", () => {
    for (const s of verifiable) {
      expect(FIXTURES[s.id]).toBeDefined();
    }
  });

  it("Jira is the one service with no generic verify", () => {
    expect(CONNECTIONS.filter((s) => !s.verify).map((s) => s.id)).toEqual(["jira"]);
    expect(buildVerifyCall(CONNECTIONS.find((s) => s.id === "jira")!)).toBeNull();
  });
});

describe("buildVerifyCall — request shape and secret-by-reference", () => {
  for (const s of verifiable) {
    it(`${s.id}: right op + url, secret referenced by name, never inlined`, () => {
      const call = buildVerifyCall(s)!;
      expect(call).not.toBeNull();
      expect(call.op).toBe(s.verify!.method === "post" ? "v/ops/http/post" : "v/ops/http/get");
      expect(call.input.url).toBe(s.verify!.url ?? s.baseUrl + (s.verify!.path ?? ""));

      const ref = `s/${s.secretName}`;
      if (s.auth === "bearer") {
        expect(call.input.bearerSecret).toBe(ref);
        expect(call.input.secretHeaders).toBeUndefined();
      } else if (s.auth === "header") {
        const headers = call.input.secretHeaders as Record<string, string>;
        if (s.secretHeaders) {
          // multi-header: the primary secret is referenced under one of the headers
          expect(Object.values(headers)).toContain(ref);
        } else {
          expect(headers[s.headerName ?? "Authorization"]).toBe(ref);
        }
        expect(call.input.bearerSecret).toBeUndefined();
      } else {
        // url mode: the token rides in the URL placeholder, no auth header
        expect(call.input.bearerSecret).toBeUndefined();
        expect(call.input.secretHeaders).toBeUndefined();
        expect(String(call.input.url)).toContain(`{s/${s.secretName}}`);
      }
      // The secret only ever appears as its s/NAME reference.
      expect(JSON.stringify(call.input)).toContain(ref);
    });
  }
});

describe("interpretVerify — success and rejection per connector", () => {
  for (const s of verifiable) {
    const fx = FIXTURES[s.id];

    it(`${s.id}: a valid 200 (string body) reads as connected`, () => {
      expect(interpretVerify(s, { status: 200, body: fx.success })).toBe(fx.connected);
    });

    it(`${s.id}: an unauthorised response is rejected, not a false success`, () => {
      expect(() => interpretVerify(s, { status: 401, body: fx.failure })).toThrow(
        new RegExp(`${s.name} rejected the token`),
      );
    });

    it(`${s.id}: a 200 with an empty body is rejected (no accidental connect)`, () => {
      expect(() => interpretVerify(s, { status: 200, body: "{}" })).toThrow(/rejected the token/);
    });
  }

  it("an already-parsed object body still works (defensive against SDK changes)", () => {
    const github = CONNECTIONS.find((s) => s.id === "github")!;
    expect(interpretVerify(github, { status: 200, body: { login: "octocat" } })).toBe("Connected as @octocat");
  });

  it("surfaces the reason from a `detail` field (Sentry 403 scope gap)", () => {
    const sentry = CONNECTIONS.find((s) => s.id === "sentry")!;
    expect(() =>
      interpretVerify(sentry, {
        status: 403,
        body: '{"detail":"You do not have permission to perform this action."}',
      }),
    ).toThrow(/Sentry rejected the token \(403\): You do not have permission/);
  });
});

// Phase 3 groundwork: the model can express a connection with more than one
// stored value — a key + a token, a two-header credential, or a site subdomain
// alongside a token — without a bespoke field per shape. These use synthetic
// services (no real catalogue entry yet); the real connectors follow.
describe("multi-value connector model", () => {
  const base = {
    method: "key" as const, blurb: "", initials: "XX", color: "#000",
    tokenUrl: "", createSteps: [], placeholder: "",
  };
  const siteScoped: ConnectionService = {
    ...base, id: "zendesk-x", name: "Zendesk", secretName: "ZENDESK_TOKEN",
    skillId: "connections/zendesk-x", category: "CRM & Support",
    baseUrl: "https://{s/ZENDESK_SITE}.zendesk.com/api/v2", auth: "bearer",
    secrets: [
      { name: "ZENDESK_SITE", label: "Site", placeholder: "acme" },
      { name: "ZENDESK_TOKEN", label: "API token" },
    ],
    verify: { path: "/users/me.json", label: (b) => (b?.user ? "Connected" : null) },
  };
  const twoHeader: ConnectionService = {
    ...base, id: "datadog-x", name: "Datadog", secretName: "DATADOG_API_KEY",
    skillId: "connections/datadog-x", category: "Dev",
    baseUrl: "https://api.datadoghq.com/api/v1", auth: "header",
    secrets: [
      { name: "DATADOG_API_KEY", label: "API key" },
      { name: "DATADOG_APP_KEY", label: "Application key" },
    ],
    secretHeaders: { "DD-API-KEY": "s/DATADOG_API_KEY", "DD-APPLICATION-KEY": "s/DATADOG_APP_KEY" },
    verify: { path: "/validate", label: (b) => (b?.valid ? "Connected" : null) },
  };
  const twoUrl: ConnectionService = {
    ...base, id: "trello-x", name: "Trello", secretName: "TRELLO_KEY",
    skillId: "connections/trello-x", category: "Docs & PM",
    baseUrl: "https://api.trello.com/1", auth: "url",
    secrets: [
      { name: "TRELLO_KEY", label: "API key" },
      { name: "TRELLO_TOKEN", label: "Token" },
    ],
    verify: {
      url: "https://api.trello.com/1/members/me?key={s/TRELLO_KEY}&token={s/TRELLO_TOKEN}",
      label: (b) => (b?.id ? "Connected" : null),
    },
  };

  it("derives a single entry for a single-value connection", () => {
    const gh = CONNECTIONS.find((s) => s.id === "github")!;
    expect(connectionSecrets(gh)).toEqual([
      { name: "GITHUB_TOKEN", label: "Token", placeholder: gh.placeholder },
    ]);
  });

  it("returns the declared list for a multi-value connection", () => {
    expect(connectionSecrets(twoHeader).map((f) => f.name)).toEqual(["DATADOG_API_KEY", "DATADOG_APP_KEY"]);
  });

  it("includes the primary secretName among its collected secrets, all valid names", () => {
    for (const s of [siteScoped, twoHeader, twoUrl]) {
      expect(s.secrets!.map((f) => f.name)).toContain(s.secretName);
      for (const f of s.secrets!) expect(f.name).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("emits both secret headers by reference for a two-header connection", () => {
    const call = buildVerifyCall(twoHeader)!;
    expect(call.input.secretHeaders).toEqual({
      "DD-API-KEY": "s/DATADOG_API_KEY",
      "DD-APPLICATION-KEY": "s/DATADOG_APP_KEY",
    });
    expect(call.input.bearerSecret).toBeUndefined();
  });

  it("keeps the {s/SITE} placeholder in the URL and bearers the token (site-scoped)", () => {
    const call = buildVerifyCall(siteScoped)!;
    expect(String(call.input.url)).toContain("{s/ZENDESK_SITE}");
    expect(call.input.bearerSecret).toBe("s/ZENDESK_TOKEN");
    expect(call.input.secretHeaders).toBeUndefined();
  });

  it("carries both {s/NAME} placeholders and adds no auth header (two-value URL)", () => {
    const call = buildVerifyCall(twoUrl)!;
    expect(String(call.input.url)).toContain("{s/TRELLO_KEY}");
    expect(String(call.input.url)).toContain("{s/TRELLO_TOKEN}");
    expect(call.input.secretHeaders).toBeUndefined();
    expect(call.input.bearerSecret).toBeUndefined();
  });
});

// Guard the invariant for any real multi-value connector added later.
describe("catalogue multi-value invariants", () => {
  for (const s of CONNECTIONS.filter((c) => c.secrets)) {
    it(`${s.id}: secrets[0] is the primary secretName and all names are valid`, () => {
      expect(s.secrets!.map((f) => f.name)).toContain(s.secretName);
      for (const f of s.secrets!) expect(f.name).toMatch(/^[A-Z0-9_]+$/);
    });
  }
});
