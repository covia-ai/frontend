import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ExecutionViewer } from "@/components/ExecutionViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

   
 
  return (

     <ContentLayout title="Jobs">
           <ExecutionViewer jobId={slug}></ExecutionViewer>
      </ContentLayout>
  )
}