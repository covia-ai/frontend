import { ConnectedAgentTalk } from "@/components/agent-connect/ConnectedAgentTalk";
import { ConnectedAgentsList } from "@/components/agent-connect/ConnectedAgentsList";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";

export default async function ConnectedAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const { agent } = await searchParams;

  return (
    <ContentLayout>
      <TopBar />
      {agent ? <ConnectedAgentTalk agentName={agent} /> : <ConnectedAgentsList />}
    </ContentLayout>
  );
}
