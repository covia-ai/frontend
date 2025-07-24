
import { ContentLayout } from "@/components/admin-panel/content-layout";

import { OperationViewer } from "@/components/OperationViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  return (

     <ContentLayout title="Operations">
             <OperationViewer assetId= {id}></OperationViewer>
      </ContentLayout>
  )
}