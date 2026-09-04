import { ConnectedAgentTalk } from "@/components/agent-connect/ConnectedAgentTalk";
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
      <ConnectedAgentTalk agentName={agent} />
    </ContentLayout>
  );
}
