import { AssetList } from "@/components/AssetList";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssetPage({ params }: Props) {
  const { slug } = await params;
  return <AssetList venueId={decodeURIComponent(slug)} />;
}
