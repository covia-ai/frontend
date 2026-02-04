
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import AgentExplorer from "@/components/AgentExplorer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  return (

      <ContentLayout>
      <TopBar/>
      <AgentExplorer agentId={id}/>
      </ContentLayout>
  )
}