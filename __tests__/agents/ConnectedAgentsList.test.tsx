import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: String(err), jobHref: undefined }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

let authed = true;
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => authed,
  useAuthStore: () => jest.fn(),
  useCurrentAuth: () => ({ type: "keypair" }),
}));

const listMock = jest.fn();
const readMock = jest.fn();
const deleteMock = jest.fn().mockResolvedValue({ deleted: true });
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  workspace: { list: listMock, read: readMock, delete: deleteMock },
  secrets: { list: jest.fn().mockResolvedValue([]) },
  operations: { run: jest.fn() },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

// Stub the heavy Port dialog: assert it opens with the converted seed.
jest.mock("@/components/PortAgentDialog", () => ({
  PortAgentDialog: ({ initialName, initialSystemPrompt }: { initialName?: string; initialSystemPrompt?: string }) => (
    <div data-testid="port-dialog-stub" data-name={initialName} data-prompt={initialSystemPrompt} />
  ),
}));

import { ConnectedAgentsList } from "@/components/agent-connect/ConnectedAgentsList";
import { notifySuccess } from "@/lib/notify";

const bindingFor = (name: string) => ({
  value: {
    type: "a2a-agent",
    a2a: {
      target: { url: `https://${name}.example.com`, kind: "a2a" },
      card: { name: `${name} card`, description: `${name} does things` },
    },
  },
});

describe("ConnectedAgentsList", () => {
  beforeEach(() => {
    authed = true;
    listMock.mockReset();
    readMock.mockReset();
    deleteMock.mockClear();
    (notifySuccess as jest.Mock).mockClear();
  });

  it("lists each connected agent with its card name and binding path", async () => {
    listMock.mockResolvedValue({ exists: true, type: "Map", keys: ["bravo", "alpha"] });
    readMock.mockImplementation((path: string) =>
      Promise.resolve(bindingFor(path.split("/").pop() as string)),
    );

    render(<ConnectedAgentsList />);

    await waitFor(() => expect(screen.getByTestId("connected-list")).toBeInTheDocument());
    expect(screen.getByText("alpha card")).toBeInTheDocument();
    expect(screen.getByText("bravo card")).toBeInTheDocument();
    expect(screen.getByText("w/a2a/agents/alpha")).toBeInTheDocument();

    // A Talk link points at the per-agent talk view.
    const talk = screen.getAllByRole("link", { name: /talk/i })[0];
    expect(talk).toHaveAttribute("href", expect.stringContaining("/agents/connected?agent="));
  });

  it("shows an empty state when no agents are connected", async () => {
    listMock.mockResolvedValue({ exists: false });
    render(<ConnectedAgentsList />);
    await waitFor(() => expect(screen.getByTestId("connected-list-empty")).toBeInTheDocument());
  });

  it("disconnects an agent by deleting its binding", async () => {
    listMock.mockResolvedValue({ exists: true, type: "Map", keys: ["alpha"] });
    readMock.mockResolvedValue(bindingFor("alpha"));

    render(<ConnectedAgentsList />);
    await waitFor(() => expect(screen.getByTestId("connected-list")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("connected-disconnect-alpha"));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("w/a2a/agents/alpha"));
    expect(notifySuccess).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("alpha card")).not.toBeInTheDocument());
  });

  it("converts a connected agent to native by seeding the Port dialog", async () => {
    listMock.mockResolvedValue({ exists: true, type: "Map", keys: ["alpha"] });
    readMock.mockResolvedValue(bindingFor("alpha"));

    render(<ConnectedAgentsList />);
    await waitFor(() => expect(screen.getByTestId("connected-list")).toBeInTheDocument());

    expect(screen.queryByTestId("port-dialog-stub")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("connected-convert-alpha"));

    const dialog = await screen.findByTestId("port-dialog-stub");
    expect(dialog).toHaveAttribute("data-name", "alpha");
    expect(dialog.getAttribute("data-prompt")).toContain("alpha card");
  });

  it("prompts to sign in when unauthenticated", async () => {
    authed = false;
    render(<ConnectedAgentsList />);
    expect(screen.getByText(/sign in to connect/i)).toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });
});
