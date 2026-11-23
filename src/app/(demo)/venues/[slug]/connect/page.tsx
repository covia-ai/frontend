import { ConnectPanel } from "@/components/venue/ConnectPanel";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function VenueConnectPage({ params }: Props) {
  const { slug } = await params;
  return <ConnectPanel venueId={routeParam(slug)} />;
}
