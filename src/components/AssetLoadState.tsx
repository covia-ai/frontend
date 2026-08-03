"use client";

import { Loader2 } from "lucide-react";
import { ErrorDisplay } from "./ErrorDisplay";

interface AssetLoadStateProps {
  loading?: boolean;
  error?: string | null;
  notFound?: boolean;
  notFoundTitle?: string;
  notFoundMessage?: string;
  className?: string;
}

// AssetViewer and OperationViewer each reimplemented their own loading
// spinner, error display, and not-found message independently
// (covia-ai/frontend#201) — one shared component for all three states.
// Renders nothing once none of loading/error/notFound apply, so callers can
// mount this unconditionally alongside their real content.
export function AssetLoadState({
  loading,
  error,
  notFound,
  notFoundTitle = "Asset Not Found",
  notFoundMessage,
  className,
}: AssetLoadStateProps) {
  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center" data-testid="asset-load-spinner">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (error) {
    return <ErrorDisplay error={error} className={className ?? "m-4"} />;
  }
  if (notFound) {
    return (
      <div className="text-center p-8" data-testid="asset-load-not-found">
        <h2 className="text-xl font-semibold text-foreground mb-2">{notFoundTitle}</h2>
        {notFoundMessage && <p className="text-muted-foreground">{notFoundMessage}</p>}
      </div>
    );
  }
  return null;
}
