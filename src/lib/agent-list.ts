import { AgentListItem } from "@/config/types";
import { DEFAULT_AGENT_ID } from "@/config/agents";

// The venue's job-free GET /api/v1/agents returns bare agent-id strings,
// while the agent:list op returns {agentId, status, tasks} objects — and the
// SDK may serve either depending on transport (normalised SDK-side from
// 1.7.1). Until the frontend picks that release up, normalise here so UI
// code always sees objects; status/tasks are simply absent on the lean shape.
//
// The reserved assistant always sorts first — every consumer (the /agents
// grid, the explorer's list panel) renders straight off this list, so
// sorting once here keeps it first everywhere without each caller re-deriving
// the same rule. Array.prototype.sort is stable, so all other agents keep
// their original relative order.
export function normalizeAgentEntries(agents: unknown[] | undefined): AgentListItem[] {
  return (agents ?? [])
    .map((a: any) => (typeof a === "string" ? { agentId: a } : a))
    .filter((a: any): a is AgentListItem => a != null && typeof a.agentId === "string")
    .sort((a, b) => Number(b.agentId === DEFAULT_AGENT_ID) - Number(a.agentId === DEFAULT_AGENT_ID));
}
