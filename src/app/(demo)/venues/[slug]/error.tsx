"use client";

import { useParams } from "next/navigation";
import { RouteErrorState } from "@/components/route-states/RouteErrorState";
import { routeParam } from "@/lib/route-params";

export default function VenueError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ slug?: string }>();
  const rawSlug = params?.slug;
  const venue = rawSlug ? routeParam(rawSlug) : "this venue";

  return (
    <RouteErrorState
      title={`Unable to load ${venue}`}
      description="The venue or one of its resources could not be loaded. Check the connection and try again."
      error={error}
      reset={reset}
      homeHref="/venues"
    />
  );
}
