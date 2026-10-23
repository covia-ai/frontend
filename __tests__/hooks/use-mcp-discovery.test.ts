import { renderHook, waitFor } from "@testing-library/react";
import type { Venue } from "@covia/covia-sdk";
import { discoverMcpUrl, useMcpDiscovery } from "@/hooks/use-mcp-discovery";

describe("useMcpDiscovery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // A Copy button reads this: after a venue switch it must never hand over the
  // previous venue's URL, even while the new venue's discovery is in flight.
  it("never reports the previous venue's URL after a switch", async () => {
    let answerB: (value: unknown) => void = () => {};
    global.fetch = jest.fn((url: string) =>
      url.startsWith("https://switch-a.example")
        ? Promise.resolve({ ok: true, json: async () => ({ server_url: "https://switch-a.example/mcp" }) })
        : new Promise((resolve) => { answerB = resolve; }),
    ) as unknown as typeof fetch;
    const venueA = { venueId: "did:key:a", baseUrl: "https://switch-a.example" } as Venue;
    const venueB = { venueId: "did:key:b", baseUrl: "https://switch-b.example" } as Venue;

    const { result, rerender } = renderHook(({ venue }) => useMcpDiscovery(venue), {
      initialProps: { venue: venueA },
    });
    await waitFor(() => expect(result.current).toBe("https://switch-a.example/mcp"));

    rerender({ venue: venueB });
    expect(result.current).toBe("Not Found");

    answerB({ ok: true, json: async () => ({ server_url: "https://switch-b.example/mcp" }) });
    await waitFor(() => expect(result.current).toBe("https://switch-b.example/mcp"));
  });
});

// Distinct baseUrls per test so the module-level per-baseUrl memo doesn't leak
// between cases.
describe("discoverMcpUrl", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches /.well-known/mcp once per baseUrl and shares the resolved server_url (W4 4A dedupe)", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ server_url: "https://venue.example/mcp" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // Two consumers (the landing + McpConnectSection) for the same venue.
    const a = discoverMcpUrl("https://venue.example");
    const b = discoverMcpUrl("https://venue.example/"); // trailing slash normalised

    expect(await a).toBe("https://venue.example/mcp");
    expect(await b).toBe("https://venue.example/mcp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://venue.example/.well-known/mcp");
  });

  it("resolves to Not Available on a non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    expect(await discoverMcpUrl("https://nook.example")).toBe("Not Available");
  });

  it("resolves to Not Available when the body carries an error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "not configured" }),
    }) as unknown as typeof fetch;
    expect(await discoverMcpUrl("https://err.example")).toBe("Not Available");
  });

  it("does not keep a failed discovery, so a later ask retries", async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ server_url: "https://flaky.example/mcp" }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await discoverMcpUrl("https://flaky.example")).toBe("Not Available");
    expect(await discoverMcpUrl("https://flaky.example")).toBe("https://flaky.example/mcp");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
