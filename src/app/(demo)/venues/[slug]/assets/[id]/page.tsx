
import { AssetViewer } from "@/components/AssetViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string, slug:string }>
}) {
  const { id } = await params
  const { slug } = await params

  return (
          <AssetViewer assetId={id} venueId={decodeURIComponent(slug)}></AssetViewer>
  )
}