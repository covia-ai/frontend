import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: String(err), jobHref: undefined }),
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const invokeMock = jest.fn();
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  operations: { invoke: invokeMock },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { ConnectedAgentTalk } from "@/components/agent-connect/ConnectedAgentTalk";

/** A minimal fake SDK Job driven by a mutable status script. */
function makeJob(initial: { status: string; output?: unknown }) {
  const TERMINAL = ["COMPLETE", "FAILED", "CANCELLED", "REJECTED", "TIMEOUT"];
  const PAUSED = ["PAUSED", "INPUT_REQUIRED", "AUTH_REQUIRED"];
  const job: {
    metadata: { status: string; output?: unknown; error?: string };
    script: string[];
    sendMessage: jest.Mock;
    refresh: jest.Mock;
    stream: () => AsyncGenerator<unknown>;
    readonly isFinished: boolean;
    readonly isPaused: boolean;
    readonly isComplete: boolean;
    readonly needsInput: boolean;
    readonly needsAuth: boolean;
  } = {
    metadata: { status: initial.status, output: initial.output },
    script: [],
    sendMessage: jest.fn().mockResolvedValue({}),
    refresh: jest.fn().mockResolvedValue(undefined),
    async *stream() {
      for (const s of job.script) {
        job.metadata.status = s;
        yield { event: "message", data: "{}", json: () => ({}) };
      }
    },
    get isFinished() {
      return TERMINAL.includes(job.metadata.status);
    },
    get isPaused() {
      return PAUSED.includes(job.metadata.status);
    },
    get isComplete() {
      return job.metadata.status === "COMPLETE";
    },
    get needsInput() {
      return job.metadata.status === "INPUT_REQUIRED";
    },
    get needsAuth() {
      return job.metadata.status === "AUTH_REQUIRED";
    },
  };
  return job;
}

const completedTask = (text: string) => ({
  id: "task-1",
  status: { state: "TASK_STATE_COMPLETED" },
  artifacts: [{ parts: [{ type: "text", text }] }],
});

describe("ConnectedAgentTalk", () => {
  beforeEach(() => invokeMock.mockReset());

  it("streams a turn and renders the agent's reply", async () => {
    const job = makeJob({ status: "PENDING", output: completedTask("Hello back") });
    job.script = ["STARTED", "COMPLETE"];
    invokeMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await userEvent.type(screen.getByTestId("connect-talk-input"), "hi");
    await userEvent.click(screen.getByTestId("connect-talk-send"));

    await waitFor(() => expect(screen.getByText("Hello back")).toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledWith(
      "v/ops/a2a/send",
      expect.objectContaining({ agent: "w/a2a/agents/venue-b-bot" }),
    );
  });

  it("surfaces an INPUT_REQUIRED interrupt and delivers the reply to the same job", async () => {
    const job = makeJob({
      status: "PENDING",
      output: { id: "task-1", artifacts: [{ parts: [{ text: "Which order number?" }] }] },
    });
    job.script = ["STARTED", "INPUT_REQUIRED"];
    invokeMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await userEvent.type(screen.getByTestId("connect-talk-input"), "I want a refund");
    await userEvent.click(screen.getByTestId("connect-talk-send"));

    await waitFor(() => expect(screen.getByText("Needs your input")).toBeInTheDocument());
    expect(screen.getByText("Which order number?")).toBeInTheDocument();

    // The reply continues the SAME job via sendMessage — not a fresh invoke.
    job.script = ["STARTED", "COMPLETE"];
    job.metadata.output = completedTask("Refund approved");
    await userEvent.type(screen.getByTestId("connect-talk-input"), "Order 123");
    await userEvent.click(screen.getByTestId("connect-talk-send"));

    await waitFor(() => expect(screen.getByText("Refund approved")).toBeInTheDocument());
    expect(job.sendMessage).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1); // only the first turn invoked
  });

  it("shows a failed task as an error", async () => {
    const job = makeJob({ status: "PENDING" });
    job.metadata.error = "boom";
    job.script = ["STARTED", "FAILED"];
    invokeMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await userEvent.type(screen.getByTestId("connect-talk-input"), "hi");
    await userEvent.click(screen.getByTestId("connect-talk-send"));

    await waitFor(() => expect(screen.getByText(/Task FAILED: boom/)).toBeInTheDocument());
  });
});
