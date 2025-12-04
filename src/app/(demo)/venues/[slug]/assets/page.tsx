import { AssetList } from "@/components/AssetList";

interface VenueOperationsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function AssetPage({ params }: VenueOperationsPageProps) {
  const { slug } = await params;
  return <AssetList/>;
} 