import { AgentStatus } from "@covia/covia-sdk";
import { errorMessage } from "@/lib/errors";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";
import type { AgentLiveActivity } from "@/hooks/use-agent-live-events";

export const AGENT_CHAT_SLOW_AFTER_MS = 30_000;

export type AgentChatResult = {
  sessionId?: string;
  response?: unknown;
};

/** Composer placeholder while a send is pending — reports the agent's live
 *  run-loop activity (from the venue's SSE tap) when available, falling
 *  back to a generic message on venues where it isn't. */
export function agentSendingPlaceholder(activity: AgentLiveActivity | null): string {
  if (activity?.kind === "tool") return `Using tool ${activity.label ?? "…"}…`;
  if (activity?.kind === "inference") return "Thinking…";
  return "Waiting for the agent's reply…";
}

// The venue allows one chat in flight per session. The client normally
// prevents a second send, but it loses track of an in-flight chat across a
// reload or dropped request — translate the venue's raw rejection (which leads
// with a hex session id) into something actionable.
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
};

export async function dispatchAgentMessage({
  agentId,
  text,
  venueId,
  venueBaseUrl,
  send,
  slowAfterMs = AGENT_CHAT_SLOW_AFTER_MS,
  agentStatus,
}: DispatchAgentMessageOptions): Promise<AgentChatResult> {
  const message = text.trim();
  // A slow reply is normal — a sleeping agent has to wake and run a full
  // turn — so slowness only ever WARNS. The send is never abandoned or
  // failed by a client-side timer: the venue already has the message, and
  // rejecting here just misreports a working agent (then invites a duplicate
  // send) while the eventual reply gets dropped.
  const slowTimer = setTimeout(() => {
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
    if (response == null || (typeof response === "string" && response.trim() === "")) {
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
