import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: String(err), jobHref: undefined }),
}));

// Real helpers, but timings shrunk so the continuation paths don't idle in tests.
jest.mock("@/lib/a2a", () => ({
  ...jest.requireActual("@/lib/a2a"),
  SETTLE_TIMEOUT_MS: 5_000,
  RESUME_TIMEOUT_MS: 200,
  POLL_INTERVAL_MS: 10,
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const sendMock = jest.fn();
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  a2a: { send: sendMock },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { ConnectedAgentTalk } from "@/components/agent-connect/ConnectedAgentTalk";

/** One scripted status transition, optionally swapping the Job's output with it. */
type Step = string | { status: string; output?: unknown };

/** A minimal fake SDK Job driven by a mutable status script. */
function makeJob(initial: { status: string; output?: unknown }) {
  const TERMINAL = ["COMPLETE", "FAILED", "CANCELLED", "REJECTED", "TIMEOUT"];
  const PAUSED = ["PAUSED", "INPUT_REQUIRED", "AUTH_REQUIRED"];
  const job: {
    metadata: { status: string; output?: unknown; error?: string };
    script: Step[];
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
        const step = typeof s === "string" ? { status: s } : s;
        job.metadata.status = step.status;
        if (typeof s !== "string" && "output" in s) job.metadata.output = s.output;
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

/** Type into the composer and send. */
async function say(text: string) {
  await userEvent.type(screen.getByTestId("connect-talk-input"), text);
  await userEvent.click(screen.getByTestId("connect-talk-send"));
}

describe("ConnectedAgentTalk", () => {
  beforeEach(() => sendMock.mockReset());

  it("streams a turn and renders the agent's reply", async () => {
    const job = makeJob({ status: "PENDING", output: completedTask("Hello back") });
    job.script = ["STARTED", "COMPLETE"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("hi");

    await waitFor(() => expect(screen.getByText("Hello back")).toBeInTheDocument());
    expect(sendMock).toHaveBeenCalledWith(
      "w/a2a/agents/venue-b-bot",
      expect.objectContaining({ role: "user" }),
      expect.anything(),
    );
  });

  it("surfaces an INPUT_REQUIRED interrupt and delivers the reply to the same job", async () => {
    const job = makeJob({
      status: "PENDING",
      output: { id: "task-1", artifacts: [{ parts: [{ text: "Which order number?" }] }] },
    });
    job.script = ["STARTED", "INPUT_REQUIRED"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("I want a refund");

    await waitFor(() => expect(screen.getByText("Needs your input")).toBeInTheDocument());
    expect(screen.getByText("Which order number?")).toBeInTheDocument();

    // The reply continues the SAME job via sendMessage — not a fresh invoke.
    job.script = ["STARTED", { status: "COMPLETE", output: completedTask("Refund approved") }];
    await say("Order 123");

    await waitFor(() => expect(screen.getByText("Refund approved")).toBeInTheDocument());
    expect(job.sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1); // only the first turn invoked
  });

  it("prefers the question on the task status over its artifacts", async () => {
    const job = makeJob({
      status: "PENDING",
      output: {
        id: "task-1",
        status: {
          state: "TASK_STATE_INPUT_REQUIRED",
          message: { role: "agent", parts: [{ text: "Which order number?" }] },
        },
        artifacts: [{ parts: [{ text: "partial draft" }] }],
      },
    });
    job.script = ["STARTED", "INPUT_REQUIRED"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("I want a refund");

    await waitFor(() => expect(screen.getByText("Which order number?")).toBeInTheDocument());
    expect(screen.queryByText("partial draft")).not.toBeInTheDocument();
  });

  it("does not re-render the interrupt while a continued task is still catching up", async () => {
    const interrupt = { id: "task-1", artifacts: [{ parts: [{ text: "Which order number?" }] }] };
    const job = makeJob({ status: "PENDING", output: interrupt });
    job.script = ["STARTED", "INPUT_REQUIRED"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("I want a refund");
    await waitFor(() => expect(screen.getByText("Needs your input")).toBeInTheDocument());

    // The venue reports the job as still INPUT_REQUIRED on the unchanged snapshot
    // before the remote picks the reply up. That must not settle the turn.
    job.script = [
      "INPUT_REQUIRED",
      "STARTED",
      { status: "COMPLETE", output: completedTask("Refund approved") },
    ];
    await say("Order 123");

    await waitFor(() => expect(screen.getByText("Refund approved")).toBeInTheDocument());
    expect(screen.getAllByText("Needs your input")).toHaveLength(1);
  });

  it("says so when a continued task never advances", async () => {
    const interrupt = { id: "task-1", artifacts: [{ parts: [{ text: "Which order number?" }] }] };
    const job = makeJob({ status: "PENDING", output: interrupt });
    job.script = ["STARTED", "INPUT_REQUIRED"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("I want a refund");
    await waitFor(() => expect(screen.getByText("Needs your input")).toBeInTheDocument());

    // The reply is accepted but the remote task never moves (covia#507).
    job.script = ["INPUT_REQUIRED"];
    await say("Order 123");

    await waitFor(() => expect(screen.getByText(/hasn't responded/)).toBeInTheDocument(), {
      timeout: 3000,
    });
    // The old prompt is not repeated, and the reply can be retried.
    expect(screen.getAllByText("Needs your input")).toHaveLength(1);
    expect(screen.getByTestId("connect-talk-input")).toHaveAttribute(
      "placeholder",
      "The agent is waiting for your reply…",
    );
  });

  it("renders an AUTH_REQUIRED interrupt with the agent's own message", async () => {
    const job = makeJob({
      status: "PENDING",
      output: {
        id: "task-1",
        status: {
          state: "TASK_STATE_AUTH_REQUIRED",
          message: { role: "agent", parts: [{ text: "Sign in to the billing API first." }] },
        },
      },
    });
    job.script = ["STARTED", "AUTH_REQUIRED"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("charge the card");

    await waitFor(() => expect(screen.getByText("Authentication required")).toBeInTheDocument());
    expect(screen.getByText(/Sign in to the billing API first\./)).toBeInTheDocument();
    expect(screen.getByText(/Reconnect it with a stored secret/)).toBeInTheDocument();
  });

  it("shows a failed task as an error", async () => {
    const job = makeJob({ status: "PENDING" });
    job.metadata.error = "boom";
    job.script = ["STARTED", "FAILED"];
    sendMock.mockResolvedValue(job);

    render(<ConnectedAgentTalk agentName="venue-b-bot" />);
    await say("hi");

    await waitFor(() => expect(screen.getByText(/Task FAILED: boom/)).toBeInTheDocument());
  });
});
