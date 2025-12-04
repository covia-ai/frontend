
import { ContentLayout } from "@/components/admin-panel/content-layout";
import TimelinePanel from "@/components/Timelinepanel";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  return (

      <ContentLayout>
      <SmartBreadcrumb/>
     
      <TimelinePanel agentId={id}></TimelinePanel>
      </ContentLayout>
  )
}