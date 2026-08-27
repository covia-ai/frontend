"use client";

import { RouteErrorState } from "@/components/route-states/RouteErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorState error={error} reset={reset} />;
}
