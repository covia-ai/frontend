
import { OperationViewer } from "@/components/OperationViewer";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string , slug: string}>
}) {
  const { id } = await params;
  const { slug } = await params;
  return (

   
             <OperationViewer assetId= {id} venueId={decodeURIComponent(slug)}></OperationViewer>
  )
}