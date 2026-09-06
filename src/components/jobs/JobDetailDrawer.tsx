"use client";

import Link from "next/link";
import type { JobMetadata } from "@covia/covia-sdk";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExecutionViewer } from "@/components/ExecutionViewer";
import { JobRowActions } from "@/components/jobs/JobRowActions";

interface JobDetailDrawerProps {
  /** The row's job record; the drawer is open while this is non-null. */
  job: JobMetadata | null;
  venueId?: string;
  /** Full-page detail href for the "Open full page" link. */
  fullHref?: string;
  onOpenChange: (open: boolean) => void;
  /** Bubbled from the row actions so the list refetches after re-run/cancel. */
  onChanged?: () => void;
}

/**
 * Slide-over job detail: click a row to peek at the rich ExecutionViewer detail
 * without leaving the list, with the same per-row actions in the header and an
 * "Open full page" link to the standalone /job/[id] route.
 */
export function JobDetailDrawer({ job, venueId, fullHref, onOpenChange, onChanged }: JobDetailDrawerProps) {
  return (
    <Sheet open={!!job} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base">Job detail</SheetTitle>
            <div className="flex items-center gap-1">
              {fullHref && (
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link href={fullHref}>
                    <ExternalLink size={14} /> Open full page
                  </Link>
                </Button>
              )}
              {job && <JobRowActions job={job} onChanged={onChanged} />}
            </div>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="job-detail-drawer-body">
          {job?.id && (
            <ExecutionViewer jobId={job.id} venueId={venueId} onNotFound={() => onOpenChange(false)} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
