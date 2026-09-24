"use client";

import { use } from "react";
import { PublicJobViewer } from "@/components/PublicJobViewer";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ id: string }>;
}

export default function JobPage({ params }: Props) {
  const { id } = use(params);
  return <PublicJobViewer jobId={routeParam(id)} />;
}
