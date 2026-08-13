"use client";

import { useParams } from "next/navigation";
import { RouteNotFoundState } from "@/components/route-states/RouteNotFoundState";

export default function VenueNotFound() {
  const params = useParams<{ slug?: string }>();
  const rawSlug = params?.slug;
  const venue = rawSlug ? decodeURIComponent(rawSlug) : "this venue";

  return (
    <RouteNotFoundState
      title={`Resource not found on ${venue}`}
      description="This venue resource may have been removed, or the link may be incorrect."
      homeHref="/venues"
    />
  );
}
