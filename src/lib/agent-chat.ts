import { AgentStatus, type Venue } from "@covia/covia-sdk";
import { errorMessage } from "@/lib/errors";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";
import type { AgentLiveActivity } from "@/hooks/use-agent-live-events";

export const AGENT_CHAT_SLOW_AFTER_MS = 30_000;

export type AgentChatResult = {
  sessionId?: string;
  response?: unknown;
};

export const AGENT_CHAT_OPERATION = "v/ops/agent/chat";

type ChatSendVenue = Pick<Venue, "operations" | "jobs">;

type SendAgentChatOptions = {
  agentId: string;
  message: string;
  /** The session to continue; omitted, the venue starts a new one. A function
   *  is asked once the sends queued ahead have been accepted, so a follow-up
   *  to a new chat can join the session that chat was given. */
  sessionId?: string | null | (() => string | null);
  /** Sends sharing a key reach the venue in the order they were made: each is
   *  handed over once the one before it has been accepted, never after waiting
   *  for its reply. */
  queue?: string;
  /** The chat's job, as soon as the venue has it. */
  onJob?: (jobId: string) => void;
  /** A new chat's session, as soon as the venue has accepted the message:
   *  well before the reply, so the conversation can be shown (and continued)
   *  even if the client stops waiting for it. */
  onSession?: (sessionId: string) => void;
};

/**
 * Sends a chat as a tracked job and waits for its reply. Unlike
 * `agents.chat()`, which hands back nothing until the reply, this reports the
 * chat's job and session as soon as the venue accepts the message: the venue
 * records the session on the job before the agent runs. Waiting can then be
 * abandoned without losing the conversation; the job keeps running and its
 * reply lands in the session either way.
 */
export async function sendAgentChat(
  venue: ChatSendVenue,
  { agentId, message, sessionId, queue, onJob, onSession }: SendAgentChatOptions,
): Promise<AgentChatResult> {
  // Accepted: the venue has the chat's job and, for a new chat, its session.
  const accept = async () => {
    const target = typeof sessionId === "function" ? sessionId() : sessionId ?? null;
    const job = await venue.operations.invoke(AGENT_CHAT_OPERATION, {
      agentId,
      message,
      ...(target ? { sessionId: target } : {}),
    });
    onJob?.(job.id);
    if (!target) {
      const accepted = await venue.jobs.get(job.id).catch(() => null);
      const minted = accepted?.metadata?.sessionId;
      if (typeof minted === "string" && minted) onSession?.(minted);
    }
    return job;
  };
  const job = await (queue ? inTurn(queue, accept) : accept());
  return (await job.result()) as AgentChatResult;
}

// Native agents take several chats on one session, oldest first, each
// answered by its own turn. Order on the venue is the order the chats were
// accepted, so a send that waits for the one before it to be accepted keeps
// the user's order without waiting for any reply.
const intakeTails = new Map<string, Promise<unknown>>();

function inTurn<T>(key: string, step: () => Promise<T>): Promise<T> {
  const ahead = intakeTails.get(key) ?? Promise.resolve();
  const mine = ahead.then(step, step);
  const tail = mine.catch(() => undefined);
  intakeTails.set(key, tail);
  // Forget a settled queue rather than keep one entry per chat ever made.
  void tail.then(() => {
    if (intakeTails.get(key) === tail) intakeTails.delete(key);
  });
  return mine;
}

/** Composer placeholder while a send is pending — reports the agent's live
 *  run-loop activity (from the venue's SSE tap) when available, falling
 *  back to a generic message on venues where it isn't. */
export function agentSendingPlaceholder(activity: AgentLiveActivity | null): string {
  if (activity?.kind === "tool") return `Using tool ${activity.label ?? "…"}…`;
  if (activity?.kind === "inference") return "Thinking…";
  return "Waiting for the agent's reply…";
}

// An external agent (A2A, another venue) takes one turn per session and
// rejects an overlapping one; native agents queue them. Translate the venue's
// raw rejection (which leads with a hex session id) into something actionable.
function friendlySendFailure(reason: unknown): unknown {
  return /already has an in-flight chat/i.test(errorMessage(reason))
    ? new Error(
        "The agent is still working on an earlier message in this session. " +
        "Wait for its reply, or start a new chat.")
    : reason;
}

/** One line for the transcript's failed-message row: why the send failed. */
export function describeSendFailure(error: unknown, venueId?: string): string {
  return errorMessage(friendlySendFailure(jobFailure(error, venueId).reason));
}

type DispatchAgentMessageOptions = {
  agentId: string;
  text: string;
  venueId: string;
  venueBaseUrl?: string;
  send: (text: string) => Promise<AgentChatResult>;
  /** Warn (never fail) when no reply after this long. */
  slowAfterMs?: number;
  /** Job-free probe of the agent's runtime status, so the slow-reply warning
   *  can report the agent's actual state instead of guessing. */
  agentStatus?: () => Promise<string | undefined>;
  /** True once the user has stopped waiting for this reply: the slow and
   *  empty-reply warnings are then left out, since nobody is waiting. A
   *  failure is still reported. */
  stoppedWaiting?: () => boolean;
};

export async function dispatchAgentMessage({
  agentId,
  text,
  venueId,
  venueBaseUrl,
  send,
  slowAfterMs = AGENT_CHAT_SLOW_AFTER_MS,
  agentStatus,
  stoppedWaiting = () => false,
}: DispatchAgentMessageOptions): Promise<AgentChatResult> {
  const message = text.trim();
  // A slow reply is normal — a sleeping agent has to wake and run a full
  // turn — so slowness only ever WARNS. The send is never abandoned or
  // failed by a client-side timer: the venue already has the message, and
  // rejecting here just misreports a working agent (then invites a duplicate
  // send) while the eventual reply gets dropped.
  const slowTimer = setTimeout(() => {
    if (stoppedWaiting()) return;
    void (async () => {
      const status = await agentStatus?.().catch(() => undefined);
      if (status === AgentStatus.SUSPENDED) {
        notifyWarning("Agent is suspended", {
          description:
            "It cannot reply until it is resumed — resume it from the status panel.",
        });
      } else {
        notifyWarning("The agent is taking a while to reply", {
          description:
            "It may be waking or mid-task. The reply will appear in the session when it arrives.",
        });
      }
    })();
  }, slowAfterMs);
  try {
    const result = await send(message);
    const response = result?.response;
    const empty = response == null || (typeof response === "string" && response.trim() === "");
    if (empty && !stoppedWaiting()) {
      notifyWarning("The agent sent an empty reply", {
        description: "It may have hit an error — check its session on the agent's page.",
      });
    }
    gtmEvent.sendAgentMessage(agentId);
    return result;
  } catch (error: unknown) {
    gtmEvent.sendAgentMessageFailed(agentId, errorMessage(error));
    const { reason, jobHref } = jobFailure(error, venueId);
    notifyError("Unable to send message", friendlySendFailure(reason), venueBaseUrl, jobHref);
    throw error;
  } finally {
    clearTimeout(slowTimer);
  }
}
