import { OperationsList } from "@/components/OperationsList";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OperationsPage({ params }: Props) {
  const { slug } = await params;
  return <OperationsList venueId={routeParam(slug)} />;
}
