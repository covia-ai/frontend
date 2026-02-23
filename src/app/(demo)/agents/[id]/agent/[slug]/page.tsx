
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import TimelinePanel from "@/components/Timelinepanel";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  const { slug } = await params;
  return (

      <ContentLayout>
      <TopBar/>
       
      </ContentLayout>
  )
}