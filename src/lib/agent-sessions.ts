import type { Session, SessionMessage } from "@/config/types";

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
        pending: Array.isArray(value.pending) ? value.pending : [],
        conversation,
      };
    })
    .sort((left, right) => (right.created ?? 0) - (left.created ?? 0));
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
