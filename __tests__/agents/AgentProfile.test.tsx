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

jest.mock("@/hooks/use-agent-explorer", () => ({ useAgentExplorer: () => controller }));
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => ({ venueId: "did:key:zVenue", baseUrl: "https://v.example" }),
}));
jest.mock("@/hooks/use-agent-fork-provenance", () => ({ useAgentForkProvenance: () => null }));
jest.mock("@/hooks/use-auth", () => ({
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
  SchedulePickerDialog: () => <button type="button">Schedule wake</button>,
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

  it("shows a not-found state with a way back when the agent has no detail", () => {
    controller.selectedAgentDetail = null;
    render(<AgentProfile agentId="ghost" />);
    expect(screen.getByTestId("agent-detail-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to agents/i })).toBeInTheDocument();
  });
});
