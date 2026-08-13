import {
  buildOAuthLoginUrl,
  parseOAuthProviders,
  safeReturnTo,
} from "@/lib/oauth";

describe("OAuth venue sign-in", () => {
  it("extracts only supported providers advertised by the venue login page", () => {
    expect(parseOAuthProviders(`
      <a href="/auth/github">GitHub</a>
      <a href='/auth/google'>Google</a>
      <a href="/auth/custom">Custom</a>
      <a href="https://evil.example/auth/microsoft/extra">Wrong path</a>
    `)).toEqual(["google", "github"]);
  });

  it("builds a venue login URL with a scoped callback and return path", () => {
    const login = new URL(buildOAuthLoginUrl({
      baseUrl: "https://venue.example/",
      provider: "microsoft",
      frontendOrigin: "https://app.example",
      venueId: "did:web:venue.example",
      returnTo: "/agents/view?agentId=manager",
    }));
    const callback = new URL(login.searchParams.get("redirect_uri")!);

    expect(login.origin + login.pathname).toBe("https://venue.example/auth/microsoft");
    expect(callback.origin + callback.pathname).toBe("https://app.example/auth/callback");
    expect(callback.searchParams.get("venueId")).toBe("did:web:venue.example");
    expect(callback.searchParams.get("returnTo")).toBe("/agents/view?agentId=manager");
  });

  it("rejects external and callback-loop return paths", () => {
    expect(safeReturnTo("https://evil.example")).toBe("/");
    expect(safeReturnTo("//evil.example")).toBe("/");
    expect(safeReturnTo("/auth/callback?again=true")).toBe("/");
    expect(safeReturnTo("/jobs?page=2")).toBe("/jobs?page=2");
  });
});
