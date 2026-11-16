import {
  MAX_NOTICE_FILE_LENGTH,
  MAX_NOTICE_MESSAGE_LENGTH,
  fetchSiteNotice,
  isNoticeDismissed,
  noticeFingerprint,
  parseSiteNotice,
  rememberNoticeDismissed,
  siteNoticeUrl,
} from "@/lib/site-notice";

const NOW = Date.parse("2026-11-16T12:00:00Z");

describe("parseSiteNotice", () => {
  it("accepts a full notice", () => {
    expect(
      parseSiteNotice(
        {
          message: "  venue-1 is unavailable while we restore it.  ",
          level: "outage",
          until: "2026-11-17T12:00:00Z",
          link: "https://status.covia.ai/incident",
        },
        NOW,
      ),
    ).toEqual({
      message: "venue-1 is unavailable while we restore it.",
      level: "outage",
      until: Date.parse("2026-11-17T12:00:00Z"),
      link: "https://status.covia.ai/incident",
    });
  });

  it("accepts a minimal notice", () => {
    expect(parseSiteNotice({ message: "Maintenance tonight.", level: "info" }, NOW)).toEqual({
      message: "Maintenance tonight.",
      level: "info",
    });
  });

  it.each([
    ["not an object", "outage!"],
    ["an array", [{ message: "x", level: "info" }]],
    ["null", null],
    ["no message", { level: "info" }],
    ["an empty message", { message: "   ", level: "info" }],
    ["a non-string message", { message: 42, level: "info" }],
    ["an overlong message", { message: "x".repeat(MAX_NOTICE_MESSAGE_LENGTH + 1), level: "info" }],
    ["an unknown level", { message: "x", level: "critical" }],
    ["no level", { message: "x" }],
    ["an unparseable until", { message: "x", level: "info", until: "soon" }],
    ["a past until", { message: "x", level: "info", until: "2026-11-16T11:59:59Z" }],
    ["a numeric until", { message: "x", level: "info", until: NOW + 1000 }],
  ])("rejects %s", (_label, raw) => {
    expect(parseSiteNotice(raw, NOW)).toBeNull();
  });

  it.each([
    ["http", "http://example.com"],
    ["javascript", "javascript:alert(1)"],
    ["relative", "/status"],
    ["not a string", 7],
  ])("drops a %s link but keeps the notice", (_label, link) => {
    expect(parseSiteNotice({ message: "x", level: "warning", link }, NOW)).toEqual({
      message: "x",
      level: "warning",
    });
  });
});

describe("siteNoticeUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_NOTICE_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_NOTICE_URL = original;
  });

  it("is null when unset or blank, so the banner is off", () => {
    delete process.env.NEXT_PUBLIC_SITE_NOTICE_URL;
    expect(siteNoticeUrl()).toBeNull();
    process.env.NEXT_PUBLIC_SITE_NOTICE_URL = "  ";
    expect(siteNoticeUrl()).toBeNull();
  });

  it("returns the configured URL", () => {
    process.env.NEXT_PUBLIC_SITE_NOTICE_URL = " https://example.com/notice.json ";
    expect(siteNoticeUrl()).toBe("https://example.com/notice.json");
  });
});

describe("fetchSiteNotice", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const respond = (body: string, ok = true) => {
    global.fetch = jest.fn().mockResolvedValue({ ok, text: () => Promise.resolve(body) }) as never;
  };

  it("returns a valid notice and fetches without credentials or cache", async () => {
    respond(JSON.stringify({ message: "Down for maintenance.", level: "warning" }));
    await expect(fetchSiteNotice("https://example.com/n.json")).resolves.toEqual({
      message: "Down for maintenance.",
      level: "warning",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/n.json",
      expect.objectContaining({ cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }),
    );
  });

  it("fails quietly on a non-2xx response, bad JSON, an oversized file or a network error", async () => {
    respond(JSON.stringify({ message: "x", level: "info" }), false);
    await expect(fetchSiteNotice("u")).resolves.toBeNull();

    respond("{not json");
    await expect(fetchSiteNotice("u")).resolves.toBeNull();

    respond(" ".repeat(MAX_NOTICE_FILE_LENGTH + 1));
    await expect(fetchSiteNotice("u")).resolves.toBeNull();

    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch")) as never;
    await expect(fetchSiteNotice("u")).resolves.toBeNull();
  });

  it("gives up after the timeout", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    ) as never;
    const result = fetchSiteNotice("u", { timeoutMs: 1000 });
    jest.advanceTimersByTime(1000);
    await expect(result).resolves.toBeNull();
    jest.useRealTimers();
  });
});

describe("notice dismissal", () => {
  const warning = { message: "Slow responses.", level: "warning" as const };
  const outage = { message: "venue-1 is down.", level: "outage" as const };

  beforeEach(() => sessionStorage.clear());

  it("remembers a dismissed warning for the session", () => {
    expect(isNoticeDismissed(warning, sessionStorage)).toBe(false);
    rememberNoticeDismissed(warning, sessionStorage);
    expect(isNoticeDismissed(warning, sessionStorage)).toBe(true);
  });

  it("shows a new notice even after the previous one was dismissed", () => {
    rememberNoticeDismissed(warning, sessionStorage);
    expect(isNoticeDismissed({ ...warning, message: "Something else." }, sessionStorage)).toBe(false);
  });

  it("never stores an outage dismissal, so it comes back on reload", () => {
    rememberNoticeDismissed(outage, sessionStorage);
    expect(sessionStorage.length).toBe(0);
    expect(isNoticeDismissed(outage, sessionStorage)).toBe(false);
  });

  it("tolerates unavailable storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => rememberNoticeDismissed(warning, broken)).not.toThrow();
    expect(isNoticeDismissed(warning, broken)).toBe(false);
    expect(isNoticeDismissed(warning, null)).toBe(false);
  });

  it("fingerprints every field that makes a notice distinct", () => {
    const base = noticeFingerprint(warning);
    expect(noticeFingerprint({ ...warning, level: "info" })).not.toBe(base);
    expect(noticeFingerprint({ ...warning, until: NOW })).not.toBe(base);
    expect(noticeFingerprint({ ...warning, link: "https://a.example" })).not.toBe(base);
  });
});
