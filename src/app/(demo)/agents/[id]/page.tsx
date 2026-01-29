
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import  TreeStructure  from "@/components/AgentTree";
import AgentTree2 from "@/components/AgentTree2";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  return (

      <ContentLayout>
      <TopBar/>
      <AgentTree2/>
      </ContentLayout>
  )
}