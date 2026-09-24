import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

const listMcpToolsMock = jest.fn();
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  listMcpTools: (...args: unknown[]) => listMcpToolsMock(...args),
  copyDataToClipBoard: jest.fn(),
}));

// Mirrors the SDK: `invoke` resolves to the started Job, `run` waits and
// resolves to the operation's *result* — which carries no job id. Keeping both
// honest is what catches a Run button wired to the wrong one.
const invokeMock = jest.fn();
const runMock = jest.fn();
const mockVenue = {
  venueId: "did:web:venue.example",
  baseUrl: "https://venue.example",
  metadata: { name: "Test Venue" },
  operations: { invoke: invokeMock, run: runMock },
};
const mockResolved = { venue: mockVenue as unknown, auth: null, status: "ready", error: null };
jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => mockResolved,
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
    Object.assign(mockResolved, { venue: mockVenue, status: "ready" });
    listMcpToolsMock.mockResolvedValue([TOOL]);
    invokeMock.mockResolvedValue({ id: "job-abc-123" });
    runMock.mockResolvedValue({ content: [{ type: "text", text: "hi" }] });
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
      expect(invokeMock).toHaveBeenCalledWith("v/ops/mcp/tools-call", expect.objectContaining({ toolName: "echo" })),
    );
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
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows a load error — not the empty state — when the tools read fails", async () => {
    listMcpToolsMock.mockRejectedValue(new Error("HTTP 503"));
    render(<McpToolsList venueId="did:web:venue.example" />);

    expect(await screen.findByTestId("mcp-tools-load-error")).toBeInTheDocument();
  });

  it("hands over to the venue resolution state instead of spinning when the venue never resolves", () => {
    Object.assign(mockResolved, { venue: undefined, status: "unreachable" });
    render(<McpToolsList venueId="did:web:gone.example" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(listMcpToolsMock).not.toHaveBeenCalled();
  });
});
