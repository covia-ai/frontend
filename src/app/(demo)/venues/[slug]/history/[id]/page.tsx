import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ExecutionViewer } from "@/components/ExecutionViewer";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

   
 
  return (

     <ContentLayout title="Operations">
          <SmartBreadcrumb />
            
           <ExecutionViewer jobId={id}></ExecutionViewer>
      </ContentLayout>
  )
}