
import { AssetViewer } from "@/components/AssetViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string, slug:string }>
}) {
  const { id, slug } = await params

  // [id] is a single segment: a bare content hash for the usual CAS asset, or
  // a percent-encoded lattice address for the rare non-hash one — see
  // AssetCard's scopedHref. Decode before handing it to the viewer.
  return (
          <AssetViewer assetId={decodeURIComponent(id)} venueId={decodeURIComponent(slug)}></AssetViewer>
  )
}
