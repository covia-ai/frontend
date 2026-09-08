import { ConnectPanel } from "@/components/venue/ConnectPanel";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function VenueConnectPage({ params }: Props) {
  const { slug } = await params;
  return <ConnectPanel venueId={decodeURIComponent(slug)} />;
}
