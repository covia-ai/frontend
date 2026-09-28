import { AdaptersList } from "@/components/AdaptersList";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdaptersPage({ params }: Props) {
  const { slug } = await params;
  return <AdaptersList venueId={routeParam(slug)} />;
}
