import { McpToolsList } from "@/components/McpToolsList";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function McpToolsPage({ params }: Props) {
  const { slug } = await params;
  return <McpToolsList venueId={routeParam(slug)} />;
}
