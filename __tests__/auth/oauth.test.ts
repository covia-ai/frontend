import { webcrypto, createHash } from "node:crypto";
import { buildOAuthLoginUrl, parseOAuthProviders, readOAuthCallback, safeReturnTo, OAUTH_ERROR } from "@/lib/oauth";
import { discoverOAuthProviders, EMPTY_DISCOVERY_TTL_MS } from "@/hooks/use-oauth-sign-in";

const VENUE = "did:web:venue.example";
const USER = "did:key:z6MkUser";
const BASE = "https://venue.example";
const jwt = (claims: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
const token = jwt({ sub: USER, iss: VENUE });
const knownVenue = (id: string) => id === VENUE ? BASE : undefined;
const begin = async (returnTo = "/jobs?page=2") => new URL(await buildOAuthLoginUrl({
  baseUrl: BASE, provider: "google", frontendOrigin: window.location.origin, venueId: VENUE, returnTo,
}));
const callback = (login: URL) => new URLSearchParams({ code: "one-use-code", state: login.searchParams.get("state")! });

describe("OAuth venue sign-in", () => {
  const realFetch = global.fetch;
  const realCrypto = global.crypto;
  let fetchMock: jest.Mock;
  beforeAll(() => Object.defineProperty(global, "crypto", { value: webcrypto, configurable: true }));
  afterAll(() => Object.defineProperty(global, "crypto", { value: realCrypto, configurable: true }));
  beforeEach(() => {
    window.sessionStorage.clear();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token, did: USER }) });
    global.fetch = fetchMock;
  });
  afterEach(() => { global.fetch = realFetch; jest.restoreAllMocks(); });

  it("extracts supported advertised providers", () => {
    expect(parseOAuthProviders(`<a href="/auth/github">GitHub</a><a href='/auth/google'>Google</a><a href="/auth/custom">Custom</a>`)).toEqual(["google", "github"]);
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example", "/auth/callback?again=true"])("refuses unsafe return path %s", (path) => {
    expect(safeReturnTo(path)).toBe("/");
  });
  it("binds an exact callback and exchanges with the matching S256 proof", async () => {
    const login = await begin();
    expect(login.origin + login.pathname).toBe(`${BASE}/auth/google`);
    expect(login.searchParams.get("redirect_uri")).toBe(`${window.location.origin}/auth/callback`);
    expect(login.searchParams.get("code_challenge_method")).toBe("S256");
    expect(login.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const params = callback(login);
    params.set("venueId", "did:web:evil.example");
    params.set("returnTo", "https://evil.example");
    expect(await readOAuthCallback(params, knownVenue)).toEqual({ status: "accepted", venueId: VENUE, token, did: USER, returnTo: "/jobs?page=2" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.href).toBe(`${BASE}/auth/exchange`);
    expect(options).toMatchObject({ method: "POST", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" });
    const form = options.body as URLSearchParams;
    expect(form.get("code")).toBe("one-use-code");
    expect(form.get("redirect_uri")).toBe(`${window.location.origin}/auth/callback`);
    expect(createHash("sha256").update(form.get("code_verifier")!).digest("base64url")).toBe(login.searchParams.get("code_challenge"));
    expect(window.sessionStorage.length).toBe(0);
    expect(await readOAuthCallback(params, knownVenue)).toMatchObject({ status: "rejected", reason: OAUTH_ERROR.transaction });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("replaces a previous pending login with fresh state and proof", async () => {
    const first = await begin(), second = await begin();
    expect(first.searchParams.get("state")).not.toBe(second.searchParams.get("state"));
    expect(first.searchParams.get("code_challenge")).not.toBe(second.searchParams.get("code_challenge"));
    expect(await readOAuthCallback(callback(first), knownVenue)).toMatchObject({ status: "rejected" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["missing", "wrong", "duplicate", "token", "error"])("refuses %s callback state/data before exchange", async (kind) => {
    const params = callback(await begin());
    if (kind === "missing") params.delete("state");
    if (kind === "wrong") params.set("state", "wrong");
    if (kind === "duplicate") params.append("state", params.get("state")!);
    if (kind === "token") params.set("token", token);
    if (kind === "error") params.set("error", "access_denied");
    expect(await readOAuthCallback(params, knownVenue)).toMatchObject({ status: "rejected", reason: OAUTH_ERROR.transaction });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects missing and expired transactions", async () => {
    const params = callback(await begin());
    const now = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(now + 300_001);
    expect(await readOAuthCallback(params, knownVenue)).toMatchObject({ status: "rejected" });
    expect(await readOAuthCallback(params, knownVenue)).toMatchObject({ status: "rejected" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([undefined, "https://different.example"])("refuses a removed or moved venue (%s)", async (base) => {
    expect(await readOAuthCallback(callback(await begin()), () => base)).toMatchObject({ status: "rejected", reason: OAUTH_ERROR.venue });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { token: "malformed", did: USER },
    { token: jwt({ sub: "other", iss: VENUE }), did: USER },
    { token: jwt({ sub: USER, iss: "other" }), did: USER },
    { token, did: null },
  ])("rejects wrongly scoped credentials", async (reply) => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => reply });
    expect(await readOAuthCallback(callback(await begin()), knownVenue)).toMatchObject({ status: "rejected", reason: OAUTH_ERROR.credential });
  });
  it("consumes a failed exchange and never exposes raw diagnostic text", async () => {
    const params = callback(await begin());
    fetchMock.mockRejectedValue(new Error("secret-provider-response"));
    expect(await readOAuthCallback(params, knownVenue)).toEqual({ status: "rejected", reason: OAUTH_ERROR.exchange });
    expect(await readOAuthCallback(params, knownVenue)).toMatchObject({ status: "rejected", reason: OAUTH_ERROR.transaction });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects HTTP errors without reading their body", async () => {
    const json = jest.fn();
    fetchMock.mockResolvedValue({ ok: false, json });
    expect(await readOAuthCallback(callback(await begin()), knownVenue)).toMatchObject({ status: "rejected", reason: OAUTH_ERROR.exchange });
    expect(json).not.toHaveBeenCalled();
  });
  it("fails closed when tab storage cannot save the verifier", async () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    await expect(begin()).rejects.toThrow(OAUTH_ERROR.start);
  });
  it("accepts an empty callback as a direct visit", async () => {
    expect(await readOAuthCallback(new URLSearchParams(), knownVenue)).toEqual({ status: "absent" });
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
