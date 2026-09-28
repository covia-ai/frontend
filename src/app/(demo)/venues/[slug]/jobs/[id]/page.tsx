import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ExecutionViewer } from "@/components/ExecutionViewer";
import { routeParam } from "@/lib/route-params";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;

  return (
    <ContentLayout>
      <ExecutionViewer jobId={routeParam(id)} venueId={routeParam(slug)} />
    </ContentLayout>
  );
}
