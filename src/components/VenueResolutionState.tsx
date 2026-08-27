"use client";

import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ChromeSignInButton } from "@/components/admin-panel/signin-button";
import type { ResolvedVenueContext } from "@/hooks/use-resolved-venue";

type VenueResolutionStateProps = {
  status: ResolvedVenueContext["status"];
  error?: string | null;
  icon: LucideIcon;
  subject: string;
  venueId?: string;
};

export function VenueResolutionState({ status, error, icon: Icon, subject, venueId }: VenueResolutionStateProps) {
  if (status === "connecting") {
    return (
      <div className="flex h-100 w-full items-center justify-center" role="status">
        <Spinner variant="ellipsis" className="text-primary" size={64} />
        <span className="sr-only">Connecting to venue</span>
      </div>
    );
  }

  if (status === "auth-required") {
    return (
      <div
        className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-8 text-center"
        data-testid="venue-auth-required"
      >
        <Lock size={40} className="text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Sign in to view {subject.toLowerCase()}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This venue doesn&apos;t allow anonymous reads. Sign in with an account this venue admits to see its {subject.toLowerCase()}.
          </p>
        </div>
        <ChromeSignInButton venueId={venueId} />
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
