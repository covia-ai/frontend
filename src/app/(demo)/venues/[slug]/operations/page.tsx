import { OperationsList } from "@/components/OperationsList";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OperationsPage({ params }: Props) {
  const { slug } = await params;
  return <OperationsList venueId={decodeURIComponent(slug)} />;
}
