
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import AgentExplorer from "@/components/AgentExplorer";

export default function Page() {
 
  return (

      <ContentLayout>
      <TopBar/>
      <AgentExplorer />
      </ContentLayout>
  )
}