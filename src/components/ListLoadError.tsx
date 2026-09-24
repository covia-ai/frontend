"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorDisplay } from "@/components/ErrorDisplay";

type ListLoadErrorProps = {
  error: string;
  onRetry: () => void;
  "data-testid"?: string;
};

/**
 * What a list shows when its read failed — in place of its empty state, which
 * would otherwise claim the venue has nothing in it.
 */
export function ListLoadError({ error, onRetry, "data-testid": testId }: ListLoadErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10" data-testid={testId}>
      <ErrorDisplay error={error} />
      <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} data-testid="list-load-retry">
        <RotateCcw size={14} aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
