import { PublicOperationViewer } from "@/components/PublicOperationViewer";

interface Props {
  params: Promise<{ path: string[] }>;
}

export default async function Page({ params }: Props) {
  const { path } = await params;
  return <PublicOperationViewer path={path} />;
}
