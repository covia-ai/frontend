import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: String(err), jobHref: undefined }),
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const runMock = jest.fn().mockResolvedValue({ path: "w/a2a/agents/support-bot", stored: true });
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  operations: { run: runMock },
  secrets: { list: jest.fn().mockResolvedValue(["REMOTE_TOKEN"]) },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { ConnectAgentDialog } from "@/components/ConnectAgentDialog";
import { notifySuccess, notifyWarning } from "@/lib/notify";

describe("ConnectAgentDialog", () => {
  beforeEach(() => {
    runMock.mockClear();
    pushMock.mockClear();
    (notifySuccess as jest.Mock).mockClear();
    (notifyWarning as jest.Mock).mockClear();
  });

  const renderOpen = () => render(<ConnectAgentDialog open onOpenChange={() => {}} />);

  it("keeps the submit disabled until a name and URL are present", async () => {
    renderOpen();
    const submit = screen.getByTestId("connect-agent-submit");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByTestId("connect-agent-name"), "Support Bot");
    await userEvent.type(screen.getByTestId("connect-agent-url"), "https://agent.example.com");
    expect(submit).toBeEnabled();
  });

  it("shows the resolved w/a2a/agents/<name> binding as the user types", async () => {
    renderOpen();
    await userEvent.type(screen.getByTestId("connect-agent-name"), "Support Bot");
    expect(screen.getByText("w/a2a/agents/support-bot")).toBeInTheDocument();
  });

  it("imports the agent and routes to its talk page", async () => {
    renderOpen();
    await userEvent.type(screen.getByTestId("connect-agent-name"), "Support Bot");
    await userEvent.type(screen.getByTestId("connect-agent-url"), "https://agent.example.com");
    await userEvent.click(screen.getByTestId("connect-agent-submit"));

    await waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledWith("v/ops/a2a/import-agent", {
      name: "support-bot",
      url: "https://agent.example.com",
    });
    expect(notifySuccess).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/agents/connected?agent=support-bot");
  });

  it("binds a stored secret when authentication is enabled", async () => {
    renderOpen();
    await userEvent.type(screen.getByTestId("connect-agent-name"), "Private Bot");
    await userEvent.type(screen.getByTestId("connect-agent-url"), "https://agent.example.com");
    await userEvent.click(screen.getByTestId("connect-agent-needs-auth"));

    // Radix Select: open and pick the stored secret.
    await userEvent.click(screen.getByTestId("connect-agent-secret"));
    await userEvent.click(await screen.findByText("s/REMOTE_TOKEN"));

    await userEvent.click(screen.getByTestId("connect-agent-submit"));

    await waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledWith("v/ops/a2a/import-agent", {
      name: "private-bot",
      url: "https://agent.example.com",
      auth: { secret: "s/REMOTE_TOKEN" },
    });
  });

  it("warns instead of importing when authentication is on but no secret is chosen", async () => {
    renderOpen();
    await userEvent.type(screen.getByTestId("connect-agent-name"), "Private Bot");
    await userEvent.type(screen.getByTestId("connect-agent-url"), "https://agent.example.com");
    await userEvent.click(screen.getByTestId("connect-agent-needs-auth"));
    await userEvent.click(screen.getByTestId("connect-agent-submit"));

    expect(notifyWarning).toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });
});
