import { McpToolsList } from "@/components/McpToolsList";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function McpToolsPage({ params }: Props) {
  const { slug } = await params;
  return <McpToolsList venueId={decodeURIComponent(slug)} />;
}
