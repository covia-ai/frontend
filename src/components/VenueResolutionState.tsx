"use client";

import type { LucideIcon } from "lucide-react";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import type { ResolvedVenueContext } from "@/hooks/use-resolved-venue";

type VenueResolutionStateProps = {
  status: ResolvedVenueContext["status"];
  error?: string | null;
  icon: LucideIcon;
  subject: string;
};

export function VenueResolutionState({ status, error, icon: Icon, subject }: VenueResolutionStateProps) {
  if (status === "connecting") {
    return (
      <div className="flex h-100 w-full items-center justify-center" role="status">
        <Spinner variant="ellipsis" className="text-primary" size={64} />
        <span className="sr-only">Connecting to venue</span>
      </div>
    );
  }

  if (status === "unreachable") {
    return (
      <div className="mx-auto mt-8 w-full max-w-2xl">
        <ErrorDisplay error={error ?? "The venue could not be reached."} />
      </div>
    );
  }

  return (
    <div className="flex h-100 w-full flex-col items-center justify-center space-y-2">
      <Icon size={64} className="text-primary" />
      <div className="text-lg text-primary">Get Started with {subject}</div>
      <div className="text-sm text-card-foreground">
        Connect to a venue to see the available {subject.toLowerCase()}.
      </div>
    </div>
  );
}
