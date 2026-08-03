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
