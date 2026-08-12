"use client";

import { use } from "react";
import { PublicJobViewer } from "@/components/PublicJobViewer";

interface Props {
  params: Promise<{ id: string }>;
}

export default function JobPage({ params }: Props) {
  const { id } = use(params);
  return <PublicJobViewer jobId={decodeURIComponent(id)} />;
}
