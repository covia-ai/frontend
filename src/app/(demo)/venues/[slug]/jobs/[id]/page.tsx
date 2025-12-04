import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ExecutionViewer } from "@/components/ExecutionViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string, slug:string }>
}) {
  const { id } = await params
  const { slug } = await params
   
 
  return (

     <ContentLayout>            
           <ExecutionViewer jobId={id} venueId={decodeURIComponent(slug)}></ExecutionViewer>
      </ContentLayout>
  )
}