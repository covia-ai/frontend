
import { ContentLayout } from "@/components/admin-panel/content-layout";

import { OperationViewer } from "@/components/OperationViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  const { slug } = await params;
  return (

     <ContentLayout>
             <OperationViewer assetId= {id} venueId={decodeURIComponent(slug)}></OperationViewer>
      </ContentLayout>
  )
}