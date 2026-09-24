import { AssetList } from "@/components/AssetList";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssetPage({ params }: Props) {
  const { slug } = await params;
  return <AssetList venueId={routeParam(slug)} />;
}
