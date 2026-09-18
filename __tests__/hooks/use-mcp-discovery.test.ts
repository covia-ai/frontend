import { discoverMcpUrl } from "@/hooks/use-mcp-discovery";

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
});
