import { AgentChat } from "@/components/agent-chat/AgentChat";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";

export default async function AgentChatPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;

  return (
    <ContentLayout>
      <TopBar />
      <AgentChat initialAgentId={agentId} />
    </ContentLayout>
  );
}
