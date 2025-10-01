import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ExecutionViewer } from "@/components/ExecutionViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

   
 
  return (

     <ContentLayout title="Operations">            
           <ExecutionViewer jobId={id}></ExecutionViewer>
      </ContentLayout>
  )
}