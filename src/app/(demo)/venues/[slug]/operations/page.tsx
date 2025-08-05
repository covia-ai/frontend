import { OperationsList } from "@/components/OperationsList";

interface VenueOperationsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function VenueOperationsPage({ params }: VenueOperationsPageProps) {
  const { slug } = await params;
  return <OperationsList venueSlug={slug} />;
} 