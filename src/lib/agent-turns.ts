// Rendering helpers for an agent conversation turn.
//
// A turn's payload lives in one of two places. `content` holds a string (a
// plain assistant/user message, or a tool turn that stringified into content —
// e.g. an "Error: ..." result). A structured result instead lands in
// `structuredContent` (the agent loop's rule: AMap/AVector → structuredContent,
// else stringify into content). The chat used to read only `content`, so a
// successful tool call — whose result is a map in `structuredContent`, with no
// `content` — rendered as an empty bubble.

export type Turn = {
  role?: string;
  content?: unknown;
  structuredContent?: unknown;
  name?: unknown;
  source?: unknown;
};

// Turn content is `string | map | any cell` per the conversation contract.
// Unwrap only when nothing can be hidden: a plain string renders as-is, and an
// envelope holding exactly one string field ({task: "..."} from agent_request,
// {message: "..."} from chat intake) renders as that string. Anything more
// structured renders as full JSON — probing "likely" keys would silently drop
// siblings and misrepresent what was actually exchanged.
export function messageContentToString(c: unknown): string {
  if (c == null) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object" && !Array.isArray(c)) {
    const keys = Object.keys(c as Record<string, unknown>);
    if (keys.length === 1 && typeof (c as Record<string, unknown>)[keys[0]] === "string") {
      return (c as Record<string, unknown>)[keys[0]] as string;
    }
  }
  return JSON.stringify(c, null, 2);
}

export type ContentSection = { label: string; text: string };

// Delegation envelopes are not a fixed schema — a delegating agent improvises
// fields (e.g. {task, expected_output}, borrowed from CrewAI-style conventions)
// — so instead of blessing one shape, ANY flat object whose values are all
// non-empty strings renders as labelled sections: every field shown, nothing
// silently dropped, and no raw JSON in a chat transcript. Single-string
// envelopes keep unwrapping to bare text (messageContentToString); anything
// nested still falls back to JSON, which honestly represents the payload.
// The venue-standard envelope fields lead regardless of stored key order —
// a delegation reads task-first; improvised extras (expected_output, …)
// follow in their original order.
const PRIMARY_SECTION_KEYS = ["task", "message"];

export function messageContentSections(c: unknown): ContentSection[] | null {
  if (c == null || typeof c !== "object" || Array.isArray(c)) return null;
  const entries = Object.entries(c as Record<string, unknown>);
  if (entries.length < 2) return null;
  if (!entries.every(([, value]) => typeof value === "string" && value.trim() !== "")) {
    return null;
  }
  const rank = (key: string) => {
    const index = PRIMARY_SECTION_KEYS.indexOf(key);
    return index === -1 ? PRIMARY_SECTION_KEYS.length : index;
  };
  return entries
    .map(([key, value], position) => ({ key, value: value as string, position }))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.position - b.position)
    .map(({ key, value }) => ({ label: sectionLabel(key), text: value }));
}

// "expected_output" → "Expected output", "maxTokens" → "Max tokens".
function sectionLabel(key: string): string {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() : key;
}

// A run of consecutive tool/system turns, as they land in `conversation` —
// e.g. skill_load then two covia_list calls back to back. Grouped so the
// transcript can show the first and collapse the rest behind a toggle
// instead of listing every call at full height.
export type TranscriptItem<M> =
  | { kind: "message"; message: M; index: number }
  | { kind: "toolGroup"; messages: M[]; index: number };

type Groupable = { role?: string; content?: unknown; source?: unknown };

export function groupTranscript<M extends Groupable>(
  conversation: M[],
): TranscriptItem<M>[] {
  const items: TranscriptItem<M>[] = [];
  for (let index = 0; index < conversation.length; index++) {
    const message = conversation[index];
    const isUserOrAssistant = message.role === "user" || message.role === "assistant";

    if (isUserOrAssistant) {
      // An assistant turn that only decided to call a tool carries no text —
      // it renders nothing, so it must not split an otherwise-consecutive
      // run of tool calls into separate groups.
      const hasTaskLabel = message.role === "user" && message.source === "request";
      if (!messageContentToString(message.content).trim() && !hasTaskLabel) continue;
      items.push({ kind: "message", message, index });
      continue;
    }

    const last = items[items.length - 1];
    if (last?.kind === "toolGroup") {
      last.messages.push(message);
    } else {
      items.push({ kind: "toolGroup", messages: [message], index });
    }
  }
  return items;
}

export type ToolTurn = { name?: string; text: string; isError: boolean };

// Present a tool/system turn: its display text and whether it was a failure.
// A failure is a `system` turn (the venue's tool-failure notice) or a tool
// result whose string content begins with "Error:" (how the loop records a
// thrown tool). A success carries its result in `structuredContent`.
export function describeToolTurn(msg: Turn): ToolTurn {
  const name = typeof msg.name === "string" ? msg.name : undefined;

  if (typeof msg.content === "string") {
    const isError = msg.role === "system" || msg.content.startsWith("Error:");
    return { name, text: msg.content, isError };
  }
  if (msg.structuredContent != null) {
    return { name, text: messageContentToString(msg.structuredContent), isError: false };
  }
  // No content and no structured result — a system notice with a non-string
  // body, or an empty result. Fall back to whatever content holds.
  return { name, text: messageContentToString(msg.content), isError: msg.role === "system" };
}
