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
  { value: "invoke", label: "invoke — look up and run operations" },
  { value: "job/read", label: "job/read — read job records and updates" },
  { value: "job/manage", label: "job/manage — control and delete jobs" },
  { value: "job/message", label: "job/message — send input to jobs" },
  { value: "schedule/manage", label: "schedule/manage — cancel or trigger schedules" },
  { value: "asset/read", label: "asset/read — read assets" },
  { value: "asset/store", label: "asset/store — store assets" },
  { value: "agent/create", label: "agent/create — create agents" },
  { value: "agent/request", label: "agent/request — task or wake other agents" },
  { value: "agent/message", label: "agent/message — message other agents" },
  { value: "agent/write", label: "agent/write — write agent state" },
  { value: "secret/write", label: "secret/write — store secrets" },
  { value: "secret/use", label: "secret/use — use stored credentials" },
  { value: "hitl/request", label: "hitl/request — raise human-in-the-loop requests" },
  { value: "mcp/manage", label: "mcp/manage — manage MCP bridging" },
  { value: "mcp/token", label: "mcp/token — manage scoped MCP tokens" },
  { value: "admin/token/mcp", label: "admin/token/mcp — administer MCP access tokens" },
  { value: "callable/call", label: "callable/call — call published functions" },
  { value: "callable/manage", label: "callable/manage — manage published functions" },
  { value: "admin/user/create", label: "admin/user/create — register users" },
  { value: "admin/user/read", label: "admin/user/read — read user info" },
  { value: "admin/user/delete", label: "admin/user/delete — delete accounts" },
  { value: "admin/adapter/manage", label: "admin/adapter/manage — adapter and module lifecycle" },
  { value: "admin/venue/restart", label: "admin/venue/restart — restart the venue" },
  { value: "admin/venue/gc", label: "admin/venue/gc — collect unused venue storage" },
  { value: "admin/sudo", label: "admin/sudo — act with another user's authority" },
  // Keep existing grants editable during the rollout. Never silently rewrite
  // or broaden them: the appropriate ability depends on the target venue.
  { value: "user/create", label: "user/create — register users (before 0.12)" },
  { value: "user/read", label: "user/read — read user info (before 0.12)" },
  { value: "adapter/manage", label: "adapter/manage — adapter lifecycle (before 0.12)" },
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
