
import { OperationViewer } from "@/components/OperationViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string[], slug: string }>
}) {
  const { id, slug } = await params;
  // [...id] captures the namespace-explicit address as path segments, e.g.
  // ["v","ops","agent","suspend"] or ["a","<hash>"]. Rejoin into the address.
  const address = id.map((s) => decodeURIComponent(s)).join("/");
  return (
    <OperationViewer assetId={address} venueId={decodeURIComponent(slug)}></OperationViewer>
  )
}
