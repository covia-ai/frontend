import {
  buildOAuthLoginUrl,
  parseOAuthProviders,
  safeReturnTo,
} from "@/lib/oauth";
import {
  discoverOAuthProviders,
  EMPTY_DISCOVERY_TTL_MS,
} from "@/hooks/use-oauth-sign-in";

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
});
