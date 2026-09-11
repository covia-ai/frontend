import { AgentRoster } from "@/components/AgentRoster";

// The Agents landing is the workforce roster. Selecting an agent opens the
// explorer workbench at /agents/agent/<id> (see agent/[agentId]/page.tsx).
export default function AgentsPage() {
  return <AgentRoster />;
}
