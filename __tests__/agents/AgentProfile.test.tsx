import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// A minimal controller — AgentProfile composes tested views, so we stub the
// heavy children and drive the hook, asserting AgentProfile's own shell.
const controller: Record<string, unknown> = {
  selectedAgentDetail: {
    agentId: "refund-bot",
    status: "SLEEPING",
    tasks: 0,
    timeline: [],
    config: { model: "gpt-4o", skills: ["w/skills/refund-policy"], caps: ["http"] },
  },
  detailLoading: false,
  detailError: null,
  sessions: [],
  selectedSessionId: null,
  suspend: jest.fn(),
  resume: jest.fn(),
  triggerAgent: jest.fn(),
  triggering: false,
  forkAgent: jest.fn(),
  forking: false,
  deleteAgent: jest.fn(),
  updateAgentConfig: jest.fn(),
};

const mockUseAgentExplorer = jest.fn((..._args: unknown[]) => controller);
jest.mock("@/hooks/use-agent-explorer", () => ({
  useAgentExplorer: (...args: unknown[]) => mockUseAgentExplorer(...args),
}));
jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => ({ venueId: "did:key:zVenue", baseUrl: "https://v.example" }),
}));
jest.mock("@/hooks/use-agent-fork-provenance", () => ({ useAgentForkProvenance: () => null }));
jest.mock("@/hooks/use-auth", () => ({
  ...require("@test/use-auth").authMock,
  useCurrentAuth: () => ({ type: "keypair", did: "did:key:z6MkOwner", privateKeyHex: "x" }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

// Stub the heavy children — each is separately tested.
jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div data-testid="topbar" /> }));
jest.mock("@/components/agent-explorer/AgentChatSurface", () => ({
  AgentChatSurface: () => <div data-testid="chat-surface" />,
}));
jest.mock("@/components/agent-explorer/AgentTimelineView", () => ({
  AgentTimelineView: () => <div data-testid="timeline-view" />,
}));
jest.mock("@/components/agent-explorer/AgentContextView", () => ({
  AgentContextView: () => <div data-testid="context-view" />,
}));
jest.mock("@/components/agent-config/AgentSettings", () => ({
  AgentSettings: () => <div data-testid="settings-view" />,
}));
jest.mock("@/components/SchedulePickerDialog", () => ({
  SchedulePickerDialog: ({ operation, input }: { operation: string; input: unknown }) => (
    <button type="button" data-operation={operation} data-input={JSON.stringify(input)}>
      Schedule wake
    </button>
  ),
}));

import { AgentProfile } from "@/components/AgentProfile";

describe("AgentProfile", () => {
  beforeEach(() => {
    controller.selectedAgentDetail = {
      agentId: "refund-bot",
      status: "SLEEPING",
      tasks: 0,
      timeline: [],
      config: { model: "gpt-4o", skills: ["w/skills/refund-policy"], caps: ["http"] },
    };
    controller.detailLoading = false;
    controller.detailError = null;
  });

  it("renders the identity header, chips, acts-as, actions and the four tabs", () => {
    render(<AgentProfile agentId="refund-bot" />);

    // Humanised name + raw id
    expect(screen.getByRole("heading", { name: "Refund Bot" })).toBeInTheDocument();
    expect(screen.getByText("refund-bot")).toBeInTheDocument();
    // Make-up: model chip, skill chip, governed (caps)
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("refund-policy")).toBeInTheDocument();
    expect(screen.getByText("governed")).toBeInTheDocument();
    // Acts-as owner identity
    expect(screen.getByText("acts as")).toBeInTheDocument();
    // Actions
    expect(screen.getByRole("button", { name: /trigger now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /schedule wake/i })).toBeInTheDocument();
    // Tabs, Conversations active by default
    expect(screen.getByRole("tab", { name: /conversations/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /context/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByTestId("chat-surface")).toBeInTheDocument();
  });

  // The URL names the agent, so the hook must never substitute another one.
  it("flags an agent paused on a person and links to where to answer (#364)", () => {
    controller.selectedAgentDetail = {
      ...(controller.selectedAgentDetail as object),
      awaiting: { input: 1, auth: 0 },
    };
    render(<AgentProfile agentId="refund-bot" />);

    const badge = screen.getByTestId("agent-awaiting");
    expect(badge).toHaveTextContent(/Waiting on you/);
    expect(badge).toHaveAttribute("href", "/inbox?agent=refund-bot");
    expect(badge).toHaveAttribute("title", "1 request needs input");
  });

  it("shows no waiting badge when nothing is pending or the venue predates it", () => {
    render(<AgentProfile agentId="refund-bot" />);
    expect(screen.queryByTestId("agent-awaiting")).not.toBeInTheDocument();
  });

  it("says who suspended the agent, when and why (covia#590)", () => {
    controller.selectedAgentDetail = {
      ...(controller.selectedAgentDetail as object),
      status: "SUSPENDED",
      suspension: { by: "did:key:z6MkOwner", ts: Date.now() - 60_000, reason: "Rotating its key" },
    };
    render(<AgentProfile agentId="refund-bot" />);

    expect(screen.getByTestId("agent-suspension-reason")).toHaveTextContent("Rotating its key");
  });

  it("shows no suspension record once the agent is no longer suspended", () => {
    controller.selectedAgentDetail = {
      ...(controller.selectedAgentDetail as object),
      suspension: { by: "did:key:z6MkOwner", ts: Date.now() - 60_000 },
    };
    render(<AgentProfile agentId="refund-bot" />);

    expect(screen.queryByTestId("agent-suspension")).not.toBeInTheDocument();
  });

  // The venue lists a scheduled event's input (and so the agent it wakes) only
  // for an operation it resolves: the catalogue path, not "agent:trigger".
  it("schedules a wake through the catalogue path of agent:trigger", () => {
    render(<AgentProfile agentId="refund-bot" />);

    const wake = screen.getByRole("button", { name: /schedule wake/i });
    expect(wake).toHaveAttribute("data-operation", "v/ops/agent/trigger");
    expect(JSON.parse(wake.getAttribute("data-input")!)).toEqual({ agentId: "refund-bot", force: false, wait: false });
  });

  it("pins the hook to the agent its URL names", () => {
    render(<AgentProfile agentId="refund-bot" />);
    expect(mockUseAgentExplorer).toHaveBeenCalledWith("refund-bot", { pinned: true });
  });

  it("shows a not-found state with a way back when the agent has no detail", () => {
    controller.selectedAgentDetail = null;
    render(<AgentProfile agentId="ghost" />);
    expect(screen.getByTestId("agent-detail-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to agents/i })).toBeInTheDocument();
  });
});
