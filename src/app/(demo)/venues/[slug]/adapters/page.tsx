import { AdaptersList } from "@/components/AdaptersList";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdaptersPage({ params }: Props) {
  const { slug } = await params;
  return <AdaptersList venueId={decodeURIComponent(slug)} />;
}
