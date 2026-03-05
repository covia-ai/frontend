
import { ContentLayout } from "@/components/admin-panel/content-layout";
import AgentExplorer from "@/components/AgentExplorer";

export default async function Page({ searchParams }: { searchParams: Promise<{ agentId?: string }> }) {
  const { agentId } = await searchParams;

  return (
      <ContentLayout>
      <AgentExplorer agentId={agentId} />

      </ContentLayout>
  )
}