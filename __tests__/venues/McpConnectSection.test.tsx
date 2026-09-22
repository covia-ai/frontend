import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCopy = jest.fn();
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  copyDataToClipBoard: (...args: unknown[]) => mockCopy(...args),
}));

import { McpConnectSection } from "@/components/venue/McpConnectSection";
import { resetMcpDiscoveryCache } from "@/hooks/use-mcp-discovery";

// Tool listing now goes through the SDK's job-free MCP manager (covia-sdk#23)
// rather than a hand-rolled fetch, so the venue double carries `mcp`.
const listToolsMock = jest.fn();
const mockVenue: any = {
  baseUrl: "https://venue.example",
  mcp: { listTools: listToolsMock },
};

describe("McpConnectSection", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    // The MCP discovery memo is shared per baseUrl — clear it so each case's
    // own fetch mock is what resolves (W4 4A).
    resetMcpDiscoveryCache();
    listToolsMock.mockResolvedValue({ tools: [] });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches the MCP server URL and shows it once resolved", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ server_url: "https://venue.example/mcp" }),
    });

    render(<McpConnectSection venue={mockVenue} slug="venue-1" />);

    const user = userEvent.setup();
    await user.click(await screen.findByText("Copy MCP URL"));

    await waitFor(() =>
      expect(mockCopy).toHaveBeenCalledWith("https://venue.example/mcp", "MCP URL copied")
    );
  });

  it("falls back to 'Not Available' when MCP discovery fails, without a toast", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    render(<McpConnectSection venue={mockVenue} slug="venue-1" />);

    const user = userEvent.setup();
    await user.click(await screen.findByText("Copy MCP URL"));

    await waitFor(() =>
      expect(mockCopy).toHaveBeenCalledWith("Not Available", "MCP URL copied")
    );
  });

  it("toggles the Claude Desktop snippet and copies it", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ server_url: "https://venue.example/mcp" }),
    });

    render(<McpConnectSection venue={mockVenue} slug="venue-1" />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Connect to Claude Desktop"));
    expect(screen.getByText(/claude_desktop_config\.json/)).toBeInTheDocument();

    await user.click(screen.getByText("Copy"));
    await waitFor(() => expect(mockCopy).toHaveBeenCalled());
    const [snippet, message] = mockCopy.mock.calls[mockCopy.mock.calls.length - 1];
    expect(snippet).toContain("mcp-remote");
    expect(message).toBe("Snippet copied");
  });

  it("navigates to the MCP tools page", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<McpConnectSection venue={mockVenue} slug="venue-1" />);
    const user = userEvent.setup();
    await user.click(screen.getByText("MCP Tools"));

    expect(mockPush).toHaveBeenCalledWith("/venues/venue-1/mcp");
  });
});
