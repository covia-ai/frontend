// config.caps entries — hard authorization scopes, {with, can}, rendered
// into the agent's system prompt as "## Your capabilities (caps)"
// (covia's ContextAssembler.capabilityNotice). Ability strings below are the
// ones actually defined venue-side: the generic crud/* + invoke abilities
// on convex-core's Capability class, plus covia-core's Abilities class for
// the covia-domain additions — not operation catalog paths (a common
// mix-up: "http/get" and "secret/extract" are ops, not abilities).
export type AgentCap = { with: string; can: string };

export const CUSTOM_ABILITY_OPTION = "__custom__";

export const COMMON_ABILITIES: { value: string; label: string }[] = [
  { value: "crud/read", label: "crud/read — read lattice state" },
  { value: "crud/write", label: "crud/write — write lattice state" },
  { value: "crud/delete", label: "crud/delete — delete lattice state" },
  { value: "asset/read", label: "asset/read — read assets" },
  { value: "asset/store", label: "asset/store — store assets" },
  { value: "agent/create", label: "agent/create — create agents" },
  { value: "agent/request", label: "agent/request — task or wake other agents" },
  { value: "agent/message", label: "agent/message — message other agents" },
  { value: "agent/write", label: "agent/write — write agent state" },
  { value: "secret/write", label: "secret/write — store secrets" },
  { value: "hitl/request", label: "hitl/request — raise human-in-the-loop requests" },
  { value: "mcp/manage", label: "mcp/manage — manage MCP bridging" },
  { value: "user/create", label: "user/create — register users" },
  { value: "user/read", label: "user/read — read user info" },
  { value: "adapter/manage", label: "adapter/manage — adapter and module lifecycle" },
];

export function emptyCap(): AgentCap {
  return { with: "", can: "" };
}

export function isAgentCap(value: unknown): value is AgentCap {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { with?: unknown }).with === "string" &&
    typeof (value as { can?: unknown }).can === "string"
  );
}

// Drops rows the user added but never filled in — a submitted caps array
// should only ever hold intentional entries, never a blank placeholder row.
export function cleanCaps(caps: AgentCap[]): AgentCap[] {
  return caps.filter((cap) => cap.with.trim() || cap.can.trim());
}

// An agent's authority (covia 0.11, UCAN.md §5.4): it acts with its
// controller's authority narrowed by `caps`. `caps: "unrestricted"` is the
// controller's whole authority; a list narrows it, and an empty list leaves
// none. An agent created without `caps`, or given `caps: null`, has no
// authority at all, so a form must always send one or the other explicitly.
// `agent:info` shows an unrestricted agent as `caps: "unrestricted"`.
export const UNRESTRICTED_CAPS = "unrestricted";

export type AgentCapsMode = "unrestricted" | "restricted";

export function isUnrestrictedCaps(value: unknown): value is typeof UNRESTRICTED_CAPS {
  return value === UNRESTRICTED_CAPS;
}

/** The caps list a config holds, or [] for "unrestricted" or none. */
export function capsListOf(value: unknown): AgentCap[] {
  return Array.isArray(value) ? value.filter(isAgentCap) : [];
}
