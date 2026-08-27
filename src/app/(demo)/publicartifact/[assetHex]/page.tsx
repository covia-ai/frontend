import { PublicArtifactViewer } from "@/components/PublicArtifactViewer";

interface Props {
  params: Promise<{ assetHex: string }>;
}

export default async function Page({ params }: Props) {
  const { assetHex } = await params;
  return <PublicArtifactViewer assetHex={assetHex} />;
}
