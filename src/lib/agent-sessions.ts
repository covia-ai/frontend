import type { AgentSession } from "@covia/covia-sdk";
import type { Session } from "@/config/types";
import { messageContentToString } from "@/lib/agent-turns";

export function agentSessionsToSessions(items: unknown): Session[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): Session => {
      const session = item as AgentSession;
      const metadata = session.metadata ?? {};
      // The SDK owns frame formats and compacted-history expansion.
      const conversation = Array.isArray(session.conversation) ? session.conversation : [];

      return {
        sessionId: String(session.id ?? ""),
        created: metadata.created,
        parties: metadata.parties,
        turns: metadata.turns ?? metadata.turnCount,
        title: metadata.title,
        pending: Array.isArray(session.pending) ? session.pending : [],
        wakeTime: typeof session.wakeTime === "number" ? session.wakeTime : undefined,
        conversation,
      };
    })
    .sort((left, right) => (right.created ?? 0) - (left.created ?? 0));
}

const MAX_DEFAULT_TITLE_LENGTH = 48;

// A session with no user-given name still deserves a better default than
// the raw timestamp/id/turns label — the first user message is what the
// person actually typed, so it reads like a title (ChatGPT-style) rather
// than a database key. Undefined when the session has no user turn yet
// (still-new sessions fall back to formatSessionLabel).
export function defaultSessionTitle(session: Session): string | undefined {
  const firstUserMessage = session.conversation.find((m) => m.role === "user");
  if (!firstUserMessage) return undefined;
  const text = messageContentToString(firstUserMessage.content)
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.length > MAX_DEFAULT_TITLE_LENGTH
    ? `${text.slice(0, MAX_DEFAULT_TITLE_LENGTH).trimEnd()}…`
    : text;
}

export function formatSessionLabel(session: Session): string {
  const shortId = session.sessionId.slice(-8);
  const created = session.created
    ? new Date(session.created).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const turns = session.turns ?? 0;
  return `${created} · …${shortId} · ${turns} turn${turns === 1 ? "" : "s"}`;
}

/** A message the venue holds for a session that no reply has answered yet. */
export type QueuedSessionMessage = {
  /** The chat's job, when the venue's envelope names one. */
  jobId?: string;
  text: string;
};

// The venue's own record of chats still waiting for a reply: a session's
// `pending` envelopes ({sessionId, message, jobId, …}). It outlives the page
// that sent them, so the transcript can show them after the client stopped
// waiting, or after a reload, until the agent takes them.
export function queuedSessionMessages(session: Session | null | undefined): QueuedSessionMessage[] {
  const pending = session?.pending;
  if (!Array.isArray(pending)) return [];
  return pending.flatMap((envelope): QueuedSessionMessage[] => {
    if (!envelope || typeof envelope !== "object" || !("message" in envelope)) return [];
    const { message, jobId } = envelope as { message?: unknown; jobId?: unknown };
    const text = messageContentToString(message).trim();
    if (!text) return [];
    return [{ ...(typeof jobId === "string" && jobId ? { jobId } : {}), text }];
  });
}
