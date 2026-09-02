import { CONNECTIONS } from "@/config/connections";
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
        expect((call.input.secretHeaders as Record<string, string>)[s.headerName ?? "Authorization"]).toBe(ref);
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
