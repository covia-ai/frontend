import { AgentListItem } from "@/config/types";

// The venue's job-free GET /api/v1/agents returns bare agent-id strings,
// while the agent:list op returns {agentId, status, tasks} objects — and the
// SDK may serve either depending on transport (normalised SDK-side from
// 1.7.1). Until the frontend picks that release up, normalise here so UI
// code always sees objects; status/tasks are simply absent on the lean shape.
export function normalizeAgentEntries(agents: unknown[] | undefined): AgentListItem[] {
  return (agents ?? [])
    .map((a: any) => (typeof a === "string" ? { agentId: a } : a))
    .filter((a: any): a is AgentListItem => a != null && typeof a.agentId === "string");
}
