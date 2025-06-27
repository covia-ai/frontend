
import { ContentLayout } from "@/components/admin-panel/content-layout";

import { FormGenerator } from "@/components/FormGenerator";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  return (

     <ContentLayout title="Operations">
             <FormGenerator assetId= {id}></FormGenerator>
      </ContentLayout>
  )
}