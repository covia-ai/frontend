
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { AgentView } from "@/components/AgentView";
import agentsJson from "@/components/public/mockAgent.json"
import { Agent } from "@/config/types";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  const agent = agentsJson.find(agent => agent.agent.id.toString() === id) as Agent;
  return (

      <ContentLayout>
      <TopBar/>
      <AgentView agent={agent}/>
      </ContentLayout>
  )
}