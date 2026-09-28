import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  // The venue failure states render a sign-in gate, which reads the path to
  // build its return-to URL.
  usePathname: () => "/venues/did:key:zVenue/mcp",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);
jest.mock("@/hooks/use-watched-jobs", () => ({
  useWatchedJobs: { getState: () => ({ watch: jest.fn() }) },
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  copyDataToClipBoard: jest.fn(),
}));

// Both halves of this page go through the SDK's MCP manager (covia-sdk#23):
// the job-free `listTools()` read, and `callToolTracked()` for a user-driven
// run, which returns the Job the result link points at. The operation
// surfaces are mocked too, so a Run button wired back to the old
// v/ops/mcp/tools-call path fails here instead of minting an untracked job.
const listToolsMock = jest.fn();
const callToolTrackedMock = jest.fn();
const invokeMock = jest.fn();
const runMock = jest.fn();
const mockVenue = {
  venueId: "did:web:venue.example",
  baseUrl: "https://venue.example",
  metadata: { name: "Test Venue" },
  operations: { invoke: invokeMock, run: runMock },
  mcp: { listTools: listToolsMock, callToolTracked: callToolTrackedMock },
};
// The page takes the whole resolution, so it can render a failure state
// instead of an endless "Loading…" (#428).
let mockResolution: Record<string, unknown>;
jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => mockResolution,
}));

import { notifyWarning } from "@/lib/notify";
import { McpToolsList } from "@/components/McpToolsList";

const TOOL = {
  name: "echo",
  description: "Echoes input",
  inputSchema: {
    properties: {
      msg: { type: "string" },
      count: { type: "integer" },
      loud: { type: "boolean" },
      opts: { type: "object" },
    },
  },
};

async function selectEchoTool(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText("echo")); // expand the accordion item
  await user.click(await screen.findByRole("button", { name: /test tool/i }));
}

describe("McpToolsList (4D)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolution = {
      descriptor: { venueId: mockVenue.venueId, baseUrl: mockVenue.baseUrl, metadata: mockVenue.metadata },
      venue: mockVenue,
      auth: null,
      isAuthenticated: false,
      status: "ready",
      error: null,
    };
    listToolsMock.mockResolvedValue({ tools: [TOOL] });
    callToolTrackedMock.mockResolvedValue({ id: "job-abc-123" });
  });

  it("seeds the test args by type, not empty strings", async () => {
    const user = userEvent.setup();
    render(<McpToolsList venueId="did:web:venue.example" />);
    await selectEchoTool(user);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const seeded = JSON.parse(textarea.value);
    expect(seeded).toEqual({ msg: "", count: 0, loud: false, opts: {} });
  });

  it("Run creates a job and shows the inline result + View-job link WITHOUT navigating", async () => {
    const user = userEvent.setup();
    render(<McpToolsList venueId="did:web:venue.example" />);
    await selectEchoTool(user);

    await user.click(screen.getByRole("button", { name: /^run$/i }));

    await waitFor(() =>
      expect(callToolTrackedMock).toHaveBeenCalledWith("echo", expect.any(Object)),
    );
    // The tracked call is the only surface a run goes through.
    expect(invokeMock).not.toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
    // Inline result appears…
    expect(await screen.findByTestId("mcp-run-result")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view job/i })).toHaveAttribute(
      "href",
      `/venues/${encodeURIComponent("did:web:venue.example")}/jobs/job-abc-123`,
    );
    // …and we did NOT navigate away.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("warns and does not run on invalid JSON args", async () => {
    const user = userEvent.setup();
    render(<McpToolsList venueId="did:web:venue.example" />);
    await selectEchoTool(user);

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    // `{{` types a literal `{` (userEvent treats `{` as a key-descriptor).
    await user.type(textarea, "{{ not json");
    await user.click(screen.getByRole("button", { name: /^run$/i }));

    expect(notifyWarning).toHaveBeenCalledWith("Arguments must be valid JSON");
    expect(callToolTrackedMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });

  it("shows a load error — not the empty state — when the tools read fails", async () => {
    listToolsMock.mockRejectedValue(new Error("HTTP 503"));
    render(<McpToolsList venueId="did:web:venue.example" />);

    expect(await screen.findByTestId("mcp-tools-load-error")).toBeInTheDocument();
  });

  // #428: a definitive resolution failure used to be swallowed — the page
  // took only the Venue, saw undefined, and sat on "Loading…" forever with
  // no way to tell a slow venue from a dead one.
  it("renders the venue error instead of a permanent Loading… when resolution fails", async () => {
    mockResolution = {
      descriptor: null,
      venue: undefined,
      auth: null,
      isAuthenticated: false,
      status: "unreachable",
      error: "Venue identity changed at https://venue-3.covia.ai",
    };

    const user = userEvent.setup();
    render(<McpToolsList venueId="did:web:venue-3.covia.ai" />);

    // ErrorDisplay leads with a summary and keeps the raw message one click
    // away, so the message itself is checked after expanding it.
    const display = await screen.findByTestId("error-display");
    await user.click(within(display).getByTestId("error-detail-toggle"));
    expect(display).toHaveTextContent("Venue identity changed at https://venue-3.covia.ai");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(listToolsMock).not.toHaveBeenCalled();
  });

  it("offers a sign-in gate when the venue requires auth", async () => {
    mockResolution = {
      descriptor: null,
      venue: undefined,
      auth: null,
      isAuthenticated: false,
      status: "auth-required",
      error: null,
    };

    render(<McpToolsList venueId="did:key:zVenue" />);

    expect(await screen.findByTestId("venue-auth-required")).toBeInTheDocument();
    expect(listToolsMock).not.toHaveBeenCalled();
  });
});
