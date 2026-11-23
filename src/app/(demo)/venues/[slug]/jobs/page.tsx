
"use client";

import { use } from "react";
import { JobList } from "@/components/JobList";
import { routeParam } from "@/lib/route-params";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function JobPage({ params }: Props) {
  const { slug } = use(params);
  return <JobList venueId={routeParam(slug)} />
}
