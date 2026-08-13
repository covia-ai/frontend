import { probeDeviceKeyAuth } from "@/lib/venue-auth-probe";

const BASE_URL = "https://venue.example";
const VENUE_ID = "did:web:venue.example";
const PRIVATE_KEY = "a".repeat(64);

describe("probeDeviceKeyAuth", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses the job-free agents endpoint", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ agents: [] }),
    });

    await expect(
      probeDeviceKeyAuth(BASE_URL, VENUE_ID, PRIVATE_KEY),
    ).resolves.toEqual({ ok: true });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/v1/agents?includeTerminated=false`);
    expect(init.headers.Authorization).toMatch(/^Bearer /);
  });

  it("reports a definite rejection without recording a login", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "User is not registered" }),
      headers: { get: () => null },
    });

    await expect(
      probeDeviceKeyAuth(BASE_URL, VENUE_ID, PRIVATE_KEY),
    ).resolves.toEqual({
      ok: false,
      kind: "rejected",
      status: 403,
      message: "HTTP 403: User is not registered",
    });
  });
});
