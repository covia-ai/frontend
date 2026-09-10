import { ContentLayout } from "@/components/admin-panel/content-layout";
import AgentExplorer from "@/components/AgentExplorer";

// The per-agent drill-in: the explorer workbench (chat, sessions, timeline,
// context, settings, and every per-agent action). Namespaced under
// /agents/agent/ so an agent id can never collide with the sibling nav routes
// (/agents/create, /agents/chat, …). Breadcrumb → Home › Agents › <name>.
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  return (
    <ContentLayout>
      <AgentExplorer agentId={decodeURIComponent(agentId)} />
    </ContentLayout>
  );
}
