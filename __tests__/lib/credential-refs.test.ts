import { credentialRefsOf, credentialUsesOf } from "@/lib/credential-refs";

describe("credentialRefsOf", () => {
  it("reads a bearer secret reference", () => {
    expect(credentialRefsOf({ url: "https://api.github.com/user", bearerSecret: "s/GITHUB_TOKEN" })).toEqual([
      { ref: "s/GITHUB_TOKEN", kind: "secret", name: "GITHUB_TOKEN" },
    ]);
  });

  it("reads an OAuth reference", () => {
    expect(credentialRefsOf({ bearerSecret: "oauth/github" })).toEqual([
      { ref: "oauth/github", kind: "oauth", name: "github" },
    ]);
  });

  it("reads every secret header, then URL placeholders, without duplicates", () => {
    const refs = credentialRefsOf({
      url: "https://{s/ZENDESK_SITE}.zendesk.com/api/v2/users/me?k={s/ZENDESK_SITE}",
      secretHeaders: { Authorization: "s/ZENDESK_AUTH", "X-Other": "s/ZENDESK_AUTH" },
    });
    expect(refs.map((r) => r.ref)).toEqual(["s/ZENDESK_AUTH", "s/ZENDESK_SITE"]);
  });

  it("ignores HIDDEN values from venues before covia#561, and anything else that isn't a reference", () => {
    expect(credentialRefsOf({ bearerSecret: "HIDDEN", secretHeaders: { Authorization: "HIDDEN" } })).toEqual([]);
    expect(credentialRefsOf({ bearerSecret: "ghp_rawtoken", secretHeaders: "s/X" })).toEqual([]);
    expect(credentialRefsOf({ bearerSecret: "s/GITHUB_TOKEN/extra" })).toEqual([]);
  });

  it("is empty for inputs that aren't objects", () => {
    expect(credentialRefsOf(undefined)).toEqual([]);
    expect(credentialRefsOf("s/GITHUB_TOKEN")).toEqual([]);
    expect(credentialRefsOf(["s/GITHUB_TOKEN"])).toEqual([]);
  });
});

describe("credentialUsesOf", () => {
  it("names the connection a secret belongs to", () => {
    const [use] = credentialUsesOf({ bearerSecret: "s/GITHUB_TOKEN" });
    expect(use.connection?.id).toBe("github");
    expect(use.label).toBe("GitHub");
  });

  it("matches an OAuth provider to the connection with that id", () => {
    const [use] = credentialUsesOf({ bearerSecret: "oauth/github" });
    expect(use.connection?.id).toBe("github");
  });

  it("groups a connection's several secrets into one use", () => {
    const uses = credentialUsesOf({
      secretHeaders: { "DD-API-KEY": "s/DATADOG_API_KEY", "DD-APPLICATION-KEY": "s/DATADOG_APP_KEY" },
    });
    expect(uses).toHaveLength(1);
    expect(uses[0].connection?.id).toBe("datadog");
    expect(uses[0].refs.map((r) => r.ref)).toEqual(["s/DATADOG_API_KEY", "s/DATADOG_APP_KEY"]);
  });

  it("matches a secret collected during multi-value setup, not just the primary one", () => {
    const [use] = credentialUsesOf({ url: "https://{s/ZENDESK_SITE}.zendesk.com/api/v2" });
    expect(use.connection?.id).toBe("zendesk");
  });

  it("shows a reference that matches no connection as itself", () => {
    expect(credentialUsesOf({ bearerSecret: "s/MY_OWN_KEY" })).toEqual([
      { connection: undefined, label: "s/MY_OWN_KEY", refs: [{ ref: "s/MY_OWN_KEY", kind: "secret", name: "MY_OWN_KEY" }] },
    ]);
  });
});
