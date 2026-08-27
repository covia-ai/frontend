import { renderHook, waitFor } from "@testing-library/react";
import { NotFoundError } from "@covia/covia-sdk";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";

let mockVenue: any;

jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: err, jobHref: undefined }),
}));

function makeVenue(venueId: string, agentIds: string[]) {
  return {
    venueId,
    agents: {
      list: jest.fn().mockResolvedValue({
        agents: agentIds.map((agentId) => ({ agentId, status: "SLEEPING", tasks: 0 })),
      }),
      info: jest.fn().mockImplementation((agentId: string) =>
        agentIds.includes(agentId)
          ? Promise.resolve({ agentId, status: "SLEEPING" })
          : Promise.reject(new NotFoundError(`Agent not found: ${agentId}`)),
      ),
    },
    agent: jest.fn().mockImplementation(() => ({
      chatSession: jest.fn(),
    })),
    workspace: {
      read: jest.fn().mockResolvedValue({ exists: false, value: null }),
      slice: jest.fn().mockResolvedValue({ values: [] }),
    },
  };
}

const { notifyError } = jest.requireMock("@/lib/notify");

describe("useAgentExplorer — venue switch under an open agent", () => {
  beforeEach(() => {
    (notifyError as jest.Mock).mockReset();
  });

  it("falls back to the explorer's list view instead of erroring when the open agent doesn't exist on the new venue", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result, rerender } = renderHook(() => useAgentExplorer("agent-a"));

    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());
    expect(result.current.selectedAgentId).toBe("agent-a");

    // Switch venues — "agent-a" belongs to venue-a and doesn't exist on
    // venue-b, so the currently selected agent is now stale.
    mockVenue = makeVenue("venue-b", ["agent-b"]);
    rerender();

    // No error toast for something the user didn't do wrong.
    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent-b"));
    expect(notifyError).not.toHaveBeenCalled();
    expect(result.current.detailError).toBe(false);
    await waitFor(() => expect(result.current.selectedAgentDetail?.agentId).toBe("agent-b"));
  });

  it("still surfaces a real error toast for non-404 failures", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agents.info.mockRejectedValue(new Error("network unreachable"));
    const { result } = renderHook(() => useAgentExplorer("agent-a"));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(result.current.selectedAgentId).toBe("agent-a");
    expect(result.current.detailError).toBe(true);
  });
});
