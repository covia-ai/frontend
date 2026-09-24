import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { NotFoundError } from "@covia/covia-sdk";
import { usePendingChats } from "@/hooks/use-pending-chats";

// AgentProfile with the real useAgentExplorer and the real chat surface: only
// the venue, the router and the page chrome are doubles. AgentProfile.test.tsx
// covers the shell against a stubbed controller; this covers the two together.
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div data-testid="top-bar" /> }));
jest.mock("@/components/SchedulePickerDialog", () => ({ SchedulePickerDialog: () => null }));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

const mockVenue: any = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  agents: {
    list: jest.fn(),
    info: jest.fn(),
    listSessions: jest.fn(),
    fork: jest.fn(),
    // An immediately-closed stream keeps the live-events hook non-live, so the
    // poll-driven expectations below hold.
    events: jest.fn().mockImplementation(async function* () {}),
  },
  agent: jest.fn(),
  workspace: { read: jest.fn() },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => mockVenue,
}));

import { AgentProfile } from "@/components/AgentProfile";

const AGENT = { agentId: "agent-1", status: "RUNNING", tasks: 0 };

// One session entry as venue.agents.listSessions returns it.
function sessionEntry(id: string, created: number, conversation: unknown[], extra = {}) {
  return {
    id,
    metadata: { created, turns: conversation.length },
    pending: [],
    frames: [{ conversation }],
    ...extra,
  };
}

function sessionsPage(items: unknown[]) {
  return { items, total: items.length, offset: 0, limit: 50 };
}

// The venue holds agent-1 only; any other id is a 404, as on a real venue.
function venueWithAgent(agent: typeof AGENT, sessions: unknown[] = []) {
  mockVenue.agents.info.mockImplementation((agentId: string) =>
    agentId === agent.agentId
      ? Promise.resolve(agent)
      : Promise.reject(new NotFoundError(`Agent not found: ${agentId}`)),
  );
  mockVenue.agents.listSessions.mockResolvedValue(sessionsPage(sessions));
  mockVenue.workspace.read.mockResolvedValue({ value: [] });
  mockVenue.agent.mockReturnValue({ chatSession: (sessionId?: string) => ({ sessionId }) });
}

async function renderProfile(agentId = AGENT.agentId) {
  await act(async () => {
    render(<AgentProfile agentId={agentId} />);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVenue.agents.events.mockImplementation(async function* () {});
});

afterEach(() => {
  act(() => usePendingChats.setState({ pendingChats: [] }));
  jest.useRealTimers();
});

describe("AgentProfile addressing", () => {
  it("shows not-found for an agent the venue does not have, never a different agent", async () => {
    venueWithAgent(AGENT);
    await renderProfile("agent-typo");

    expect(await screen.findByTestId("agent-detail-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-trigger")).not.toBeInTheDocument();
    expect(mockVenue.agents.info).not.toHaveBeenCalledWith(AGENT.agentId);
  });

  it("shows an explicit error state when the detail fails to load", async () => {
    venueWithAgent(AGENT);
    mockVenue.agents.info.mockRejectedValue(new Error("boom"));
    await renderProfile();

    expect(await screen.findByTestId("agent-detail-error")).toBeInTheDocument();
  });

  it("moves to the fork's own URL once it is created", async () => {
    venueWithAgent(AGENT);
    mockVenue.agents.fork.mockResolvedValue({
      agentId: "agent 1 fork",
      status: "SLEEPING",
      created: true,
      forkedFrom: AGENT.agentId,
    });
    await renderProfile();

    fireEvent.click(await screen.findByTestId("fork-agent-trigger"));
    fireEvent.change(screen.getByTestId("fork-agent-id"), { target: { value: "agent 1 fork" } });
    fireEvent.click(screen.getByTestId("fork-agent-submit"));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/agents/agent/agent%201%20fork"));
  });

  it("stays put when the venue rejects the fork", async () => {
    venueWithAgent(AGENT);
    mockVenue.agents.fork.mockRejectedValue(new Error("Target agent already exists"));
    await renderProfile();

    fireEvent.click(await screen.findByTestId("fork-agent-trigger"));
    fireEvent.click(screen.getByTestId("fork-agent-submit"));

    await waitFor(() => expect(mockVenue.agents.fork).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("AgentProfile runtime controls", () => {
  it("lists queued session messages and the next wake", async () => {
    venueWithAgent({ ...AGENT, status: "SLEEPING" }, [
      sessionEntry("sess-1", 1000, [], {
        wakeTime: 1750000000000,
        pending: [{ message: { content: "Waiting for review" } }],
      }),
    ]);
    await renderProfile();

    fireEvent.click(await screen.findByTestId("runtime-pending-toggle"));

    expect(screen.getByText("Waiting for review")).toBeInTheDocument();
    expect(screen.getByTestId("runtime-next-wake")).toBeInTheDocument();
  });

  it("triggers a run only after the confirmation", async () => {
    const trigger = jest.fn().mockResolvedValue({ agentId: AGENT.agentId, status: "SLEEPING" });
    venueWithAgent({ ...AGENT, status: "SLEEPING" });
    mockVenue.agent.mockReturnValue({ chatSession: (sessionId?: string) => ({ sessionId }), trigger });
    await renderProfile();

    fireEvent.click(await screen.findByTestId("agent-trigger"));
    expect(trigger).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId("agent-trigger-confirm"));

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
  });

  it("does not offer a manual trigger for a suspended agent", async () => {
    venueWithAgent({ ...AGENT, status: "SUSPENDED" });
    await renderProfile();

    expect(await screen.findByTestId("agent-trigger")).toBeDisabled();
  });
});

// A dispatched chat is echoed wherever its transcript is shown, whoever sent
// it: the home prompt fires venue.agents.chat() and routes away, so a transcript
// can mount mid-send with no send state of its own, and a user can navigate
// away from one and back while an agent is still thinking.
describe("AgentProfile with a chat in flight", () => {
  const pending = (sessionId: string | null, text: string, agentId = AGENT.agentId) =>
    usePendingChats.getState().startPendingChat({ agentId, sessionId, text, turnsAtSend: 0 });

  it("echoes the in-flight message with a thinking indicator", async () => {
    pending(null, "sent elsewhere");
    venueWithAgent(AGENT, [sessionEntry("sess-1", 1000, [])]);
    await renderProfile();

    expect(await screen.findByTestId("pending-user-message")).toHaveTextContent("sent elsewhere");
    expect(screen.getByTestId("agent-thinking")).toBeInTheDocument();
  });

  it("echoes a send bound to the session in view", async () => {
    pending("sess-1", "bound to sess-1");
    venueWithAgent(AGENT, [sessionEntry("sess-1", 1000, [])]);
    await renderProfile();

    expect(await screen.findByTestId("pending-user-message")).toHaveTextContent("bound to sess-1");
  });

  it("ignores a send bound to a different session of the same agent", async () => {
    pending("sess-other", "elsewhere");
    venueWithAgent(AGENT, [sessionEntry("sess-1", 1000, [])]);
    await renderProfile();

    await screen.findByTestId("composer-input");
    expect(screen.queryByTestId("pending-user-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-thinking")).not.toBeInTheDocument();
  });

  it("ignores a send dispatched to a different agent", async () => {
    pending(null, "not for agent-1", "other-agent");
    venueWithAgent(AGENT, [sessionEntry("sess-1", 1000, [])]);
    await renderProfile();

    await screen.findByTestId("composer-input");
    expect(screen.queryByTestId("pending-user-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-thinking")).not.toBeInTheDocument();
  });

  it("drops the echo once the venue records the turn, so it is never doubled", async () => {
    pending("sess-1", "sent elsewhere");
    venueWithAgent(AGENT, [
      sessionEntry("sess-1", 1000, [{ role: "user", source: "chat", content: "sent elsewhere", ts: 1 }]),
    ]);
    await renderProfile();

    await screen.findByTestId("agent-thinking");
    expect(screen.queryByTestId("pending-user-message")).not.toBeInTheDocument();
    // Scoped to the transcript: the session picker also shows this text as its
    // default title, which is not the doubled echo this guards against.
    expect(
      within(screen.getByTestId("agent-transcript")).getAllByText("sent elsewhere"),
    ).toHaveLength(1);
  });

  // Same mechanism, local origin: the composer publishes to the shared store
  // rather than keeping its own copy of the in-flight message.
  it("echoes a message sent from the composer, and blocks a second send", async () => {
    venueWithAgent(AGENT, [sessionEntry("sess-1", 1000, [])]);
    // A send that never settles — the agent is still thinking.
    mockVenue.agent.mockReturnValue({
      chatSession: (sessionId?: string) => ({ sessionId, send: () => new Promise(() => {}) }),
    });
    await renderProfile();

    const input = await screen.findByTestId("composer-input");
    fireEvent.change(input, { target: { value: "typed here" } });
    fireEvent.click(screen.getByTestId("composer-send"));

    expect(await screen.findByTestId("pending-user-message")).toHaveTextContent("typed here");
    expect(screen.getByTestId("agent-thinking")).toBeInTheDocument();
    expect(screen.getByTestId("composer-send")).toBeDisabled();
    expect(input).toBeDisabled();
  });

  // The venue mints the session server-side, so it does not exist while the
  // send is in flight. Falling back to the newest session that does exist would
  // stack the pending message on top of an unrelated conversation.
  it("holds the transcript blank rather than showing an unrelated session", async () => {
    const chat = pending(null, "awaiting a session");
    venueWithAgent(AGENT, [
      sessionEntry("sess-1", 1000, [{ role: "assistant", content: "older-session-reply", ts: 1 }]),
    ]);
    await renderProfile();

    expect(await screen.findByTestId("pending-user-message")).toBeInTheDocument();
    expect(screen.queryByText("older-session-reply")).not.toBeInTheDocument();

    // Settling the send releases the hold, and the newest session is selected.
    act(() => usePendingChats.getState().clearPendingChat(chat));
    expect(await screen.findByText("older-session-reply")).toBeInTheDocument();
  });
});

// A null session means two different things — "nothing picked yet", which
// auto-select resolves, and "the user asked for a fresh chat", which it must
// not. Conflating them made New chat snap straight back to the newest session.
describe("AgentProfile session selection", () => {
  const older = sessionEntry("sess-1", 1000, [{ role: "assistant", content: "older-session-reply", ts: 1 }]);
  const newer = sessionEntry("sess-2", 2000, [{ role: "assistant", content: "newer-session-reply", ts: 2 }]);

  it("stays on a requested new chat instead of reselecting the newest session", async () => {
    jest.useFakeTimers();
    venueWithAgent(AGENT, [older]);
    await renderProfile();
    expect(await screen.findByText("older-session-reply")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("new-session"));
    await waitFor(() => expect(screen.queryByText("older-session-reply")).not.toBeInTheDocument());

    // ...and a poll landing mid-compose must not drag it back either.
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.queryByText("older-session-reply")).not.toBeInTheDocument();
  });

  it("leaves the selected session alone when a newer one appears", async () => {
    jest.useFakeTimers();
    venueWithAgent(AGENT, [older]);
    await renderProfile();
    await screen.findByText("older-session-reply");

    mockVenue.agents.listSessions.mockResolvedValue(sessionsPage([older, newer]));
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });

    expect(screen.getByText("older-session-reply")).toBeInTheDocument();
    expect(screen.queryByText("newer-session-reply")).not.toBeInTheDocument();
  });
});
