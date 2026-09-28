import {
  buildOAuthLoginUrl,
  oauthState,
  parseOAuthProviders,
  readOAuthCallback,
  safeReturnTo,
} from "@/lib/oauth";
import {
  discoverOAuthProviders,
  EMPTY_DISCOVERY_TTL_MS,
} from "@/hooks/use-oauth-sign-in";

const VENUE = "did:web:venue.example";
const USER = "did:key:z6MkUser";

// Unsigned on purpose: the frontend never verifies the signature (the venue
// does, on every call) — it only reads the claims.
const jwt = (claims: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

const callbackParams = (overrides: Record<string, string | null> = {}) => {
  const params = new URLSearchParams({
    token: jwt({ sub: USER, iss: VENUE, aud: VENUE }),
    did: USER,
    venueId: VENUE,
    returnTo: "/jobs?page=2",
    state: oauthState(),
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return params;
};
const knownVenue = (venueId: string) => venueId === VENUE;

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
      state: "nonce-123",
    }));
    const callback = new URL(login.searchParams.get("redirect_uri")!);

    expect(login.origin + login.pathname).toBe("https://venue.example/auth/microsoft");
    expect(callback.origin + callback.pathname).toBe("https://app.example/auth/callback");
    expect(callback.searchParams.get("venueId")).toBe("did:web:venue.example");
    expect(callback.searchParams.get("returnTo")).toBe("/agents/view?agentId=manager");
    expect(callback.searchParams.get("state")).toBe("nonce-123");
  });

  it("rejects external and callback-loop return paths", () => {
    expect(safeReturnTo("https://evil.example")).toBe("/");
    expect(safeReturnTo("//evil.example")).toBe("/");
    expect(safeReturnTo("/auth/callback?again=true")).toBe("/");
    expect(safeReturnTo("/jobs?page=2")).toBe("/jobs?page=2");
  });

  describe("callback validation", () => {
    beforeEach(() => window.sessionStorage.clear());

    it("keeps one unguessable nonce per tab until a callback consumes it", () => {
      const state = oauthState();
      expect(state).toMatch(/^[0-9a-f]{32}$/);
      expect(oauthState()).toBe(state);
    });

    it("accepts a response that answers this tab's sign-in", () => {
      expect(readOAuthCallback(callbackParams(), knownVenue)).toEqual({
        status: "accepted",
        venueId: VENUE,
        token: expect.any(String),
        did: USER,
        returnTo: "/jobs?page=2",
      });
    });

    it("treats a callback URL with no token as not a sign-in at all", () => {
      expect(readOAuthCallback(callbackParams({ token: null }), knownVenue)).toEqual({ status: "absent" });
    });

    // Login CSRF: a crafted link carrying the attacker's own valid token.
    it.each([
      ["a missing state", { state: null }],
      ["a state this tab never issued", { state: "f".repeat(32) }],
    ])("rejects %s", (_label, overrides) => {
      expect(readOAuthCallback(callbackParams(overrides), knownVenue).status).toBe("rejected");
    });

    it("rejects any response when this tab never started a sign-in", () => {
      const params = callbackParams();
      window.sessionStorage.clear();
      expect(readOAuthCallback(params, knownVenue).status).toBe("rejected");
    });

    it("accepts a given callback only once", () => {
      const params = callbackParams();
      expect(readOAuthCallback(params, knownVenue).status).toBe("accepted");
      expect(readOAuthCallback(params, knownVenue).status).toBe("rejected");
    });

    it.each([
      ["a venue the browser is not connected to", { venueId: "did:web:elsewhere.example" }],
      ["no venue", { venueId: null }],
      ["a DID the token was not issued for", { did: "did:key:z6MkSomeoneElse" }],
      ["a token issued by a different venue", { token: jwt({ sub: USER, iss: "did:web:elsewhere.example" }) }],
      ["a token that is not a JWT", { token: "not-a-jwt" }],
    ])("rejects %s", (_label, overrides) => {
      expect(readOAuthCallback(callbackParams(overrides), knownVenue).status).toBe("rejected");
    });

    it("never returns to an external URL", () => {
      const result = readOAuthCallback(callbackParams({ returnTo: "https://evil.example" }), knownVenue);
      expect(result).toMatchObject({ status: "accepted", returnTo: "/" });
    });
  });
});

describe("OAuth provider discovery cache", () => {
  const GOOGLE_LOGIN_PAGE = `<a href="/auth/google">Google</a>`;
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  const served = (body: string) => ({ ok: true, text: () => Promise.resolve(body) });
  const notFound = () => ({ ok: false, text: () => Promise.resolve("") });

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = realFetch;
  });

  it("probes a venue once however many callers ask at the same time", async () => {
    fetchMock.mockResolvedValue(served(GOOGLE_LOGIN_PAGE));
    const venue = "https://concurrent.example";

    const [first, second] = await Promise.all([
      discoverOAuthProviders(venue),
      discoverOAuthProviders(`${venue}/`),
    ]);

    expect(first).toEqual(["google"]);
    expect(second).toEqual(["google"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps an answer that found providers without asking again", async () => {
    fetchMock.mockResolvedValue(served(GOOGLE_LOGIN_PAGE));
    const venue = "https://configured.example";

    expect(await discoverOAuthProviders(venue)).toEqual(["google"]);
    jest.setSystemTime(Date.now() + EMPTY_DISCOVERY_TTL_MS * 10);
    expect(await discoverOAuthProviders(venue)).toEqual(["google"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-probes a venue that advertised none, so SSO appears once an operator enables it", async () => {
    fetchMock.mockResolvedValueOnce(notFound());
    const venue = "https://unconfigured.example";

    expect(await discoverOAuthProviders(venue)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Still trusted inside the TTL, so a render storm cannot hammer the venue.
    expect(await discoverOAuthProviders(venue)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The operator configures a provider; the next probe past the TTL sees it.
    jest.setSystemTime(Date.now() + EMPTY_DISCOVERY_TTL_MS + 1);
    fetchMock.mockResolvedValueOnce(served(GOOGLE_LOGIN_PAGE));

    expect(await discoverOAuthProviders(venue)).toEqual(["google"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats an unreachable venue as advertising none, and retries it later", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const venue = "https://offline.example";

    expect(await discoverOAuthProviders(venue)).toEqual([]);

    jest.setSystemTime(Date.now() + EMPTY_DISCOVERY_TTL_MS + 1);
    fetchMock.mockResolvedValueOnce(served(GOOGLE_LOGIN_PAGE));

    expect(await discoverOAuthProviders(venue)).toEqual(["google"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks again straight away after a probe that got no reply", async () => {
    // No reply is not an answer: caching it, even briefly, would hide SSO
    // behind a transient network failure until the page was reloaded.
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const venue = "https://flaky.example";

    expect(await discoverOAuthProviders(venue)).toEqual([]);

    fetchMock.mockResolvedValueOnce(served(GOOGLE_LOGIN_PAGE));
    expect(await discoverOAuthProviders(venue)).toEqual(["google"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
