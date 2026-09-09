import { ContentLayout } from "@/components/admin-panel/content-layout";
import AgentExplorer from "@/components/AgentExplorer";
import { AgentRoster } from "@/components/AgentRoster";

// Roster-first: with no agent selected this is the workforce roster; selecting
// an agent (?agentId=) opens the full explorer workbench (chat, settings,
// timeline, context and every per-agent action) as the drill-in.
export default async function ViewAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;

  if (agentId) {
    return (
      <ContentLayout>
        <AgentExplorer agentId={agentId} />
      </ContentLayout>
    );
  }

  return <AgentRoster />;
}
