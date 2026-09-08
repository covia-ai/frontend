import type { AgentSession } from "@covia/covia-sdk";
import type { Session, SessionMessage } from "@/config/types";
import { messageContentToString } from "@/lib/agent-turns";

export function agentSessionsToSessions(items: unknown): Session[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): Session => {
      const session = item as AgentSession;
      const metadata = session.metadata ?? {};
      const frames = Array.isArray(session.frames) ? session.frames : [];
      const conversation = frames.flatMap((frame) => {
        const f = frame as { conversation?: SessionMessage[] } | undefined;
        return Array.isArray(f?.conversation) ? f.conversation : [];
      });

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
