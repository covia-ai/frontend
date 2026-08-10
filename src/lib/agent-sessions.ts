import type { Session, SessionMessage } from "@/config/types";
import { messageContentToString } from "@/lib/agent-turns";

export function sessionEntriesToSessions(entries: unknown): Session[] {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry): Session => {
      const record = entry as {
        key?: unknown;
        value?: {
          meta?: {
            created?: number;
            parties?: Session["parties"];
            turns?: number;
            title?: string;
          };
          pending?: unknown[];
          frames?: Array<{ conversation?: SessionMessage[] }>;
        };
      };
      const value = record.value ?? {};
      const meta = value.meta ?? {};
      const frames = Array.isArray(value.frames) ? value.frames : [];
      const conversation = frames.flatMap((frame) =>
        Array.isArray(frame?.conversation) ? frame.conversation : [],
      );

      return {
        sessionId: String(record.key ?? ""),
        created: meta.created,
        parties: meta.parties,
        turns: meta.turns,
        title: meta.title,
        pending: Array.isArray(value.pending) ? value.pending : [],
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
