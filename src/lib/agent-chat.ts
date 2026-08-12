import { errorMessage } from "@/lib/errors";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";

export const AGENT_CHAT_TIMEOUT_MS = 30_000;

export type AgentChatResult = {
  sessionId?: string;
  response?: unknown;
};

type DispatchAgentMessageOptions = {
  agentId: string;
  text: string;
  venueId: string;
  venueBaseUrl?: string;
  send: (text: string) => Promise<AgentChatResult>;
  timeoutMs?: number;
};

export async function dispatchAgentMessage({
  agentId,
  text,
  venueId,
  venueBaseUrl,
  send,
  timeoutMs = AGENT_CHAT_TIMEOUT_MS,
}: DispatchAgentMessageOptions): Promise<AgentChatResult> {
  const message = text.trim();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Agent is not responding — it may be suspended. Check the status panel.")),
        timeoutMs,
      );
    });
    const result = await Promise.race([send(message), timeout]);
    const response = result?.response;
    if (response == null || (typeof response === "string" && response.trim() === "")) {
      notifyWarning("The agent sent an empty reply", {
        description: "It may have hit an error — check its session in the explorer.",
      });
    }
    gtmEvent.sendAgentMessage(agentId);
    return result;
  } catch (error: unknown) {
    gtmEvent.sendAgentMessageFailed(agentId, errorMessage(error));
    const { reason, jobHref } = jobFailure(error, venueId);
    notifyError("Unable to send message", reason, venueBaseUrl, jobHref);
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
