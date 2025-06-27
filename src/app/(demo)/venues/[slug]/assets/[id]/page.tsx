import { ContentLayout } from "@/components/admin-panel/content-layout";

import Link from "next/link";
import { AssetViewer } from "@/components/AssetViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
 
  return (

     <ContentLayout title="Assets">
         
           <AssetViewer assetId={id}></AssetViewer>
      </ContentLayout>
  )
}