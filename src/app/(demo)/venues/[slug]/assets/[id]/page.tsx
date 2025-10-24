import { ContentLayout } from "@/components/admin-panel/content-layout";

import { AssetViewer } from "@/components/AssetViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string, slug:string }>
}) {
  const { id } = await params
  const { slug } = await params

  return (

     <ContentLayout title="Assets">
         
           <AssetViewer assetId={id} venueId={decodeURIComponent(slug)}></AssetViewer>
      </ContentLayout>
  )
}