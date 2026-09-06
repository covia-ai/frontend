"use client";

import { useState } from "react";
import type { JobMetadata } from "@covia/covia-sdk";
import { Ban, Download, Loader2, MoreHorizontal, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { abbreviateJobId } from "@/lib/job-visuals";

const ACTIVE = new Set(["PENDING", "STARTED", "PAUSED", "INPUT_REQUIRED", "AUTH_REQUIRED"]);

interface JobRowActionsProps {
  job: JobMetadata;
  /** Called after an action changes venue state, so the list can refetch. */
  onChanged?: () => void;
}

/**
 * Per-row job actions: re-run the same operation with the same input, cancel a
 * still-running job, or download the job record as a JSON receipt. Re-run and
 * cancel go through the SDK job/operation surface; the receipt is built
 * client-side from the fetched record. Cancel confirms first (it can lose
 * in-flight work).
 */
export function JobRowActions({ job, onChanged }: JobRowActionsProps) {
  const venue = useAuthenticatedVenue();
  const [busy, setBusy] = useState<null | "rerun" | "cancel" | "receipt">(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const jobId = job.id ?? "";
  const isActive = ACTIVE.has((job.status ?? "").toUpperCase());

  const rerun = async () => {
    if (!venue) return notifyWarning("Please connect to a venue first");
    setBusy("rerun");
    try {
      // The list record is a summary; fetch the full job for its operation + input.
      const full = await venue.jobs.get(jobId);
      // Job records carry the operation as a content hash under `op` (see #322);
      // fall back to `operation` for any record that surfaces the path instead.
      const meta = full.metadata as Record<string, unknown>;
      const operation = (meta.op ?? meta.operation) as string | undefined;
      if (!operation) throw new Error("This job has no operation reference to re-run.");
      const newJob = await venue.operations.invoke(operation, full.metadata.input);
      notifySuccess("Re-running operation", {
        description: `New job ${abbreviateJobId(newJob.id)}`,
        receiptHref: newJob.id ? `/job/${newJob.id}` : undefined,
      });
      onChanged?.();
    } catch (err) {
      const { reason } = jobFailure(err, venue.venueId);
      notifyError("Unable to re-run job", reason, venue.baseUrl);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!venue) return notifyWarning("Please connect to a venue first");
    setBusy("cancel");
    try {
      await venue.jobs.cancel(jobId);
      notifySuccess(`Cancelled job ${abbreviateJobId(jobId)}`);
      onChanged?.();
    } catch (err) {
      const { reason } = jobFailure(err, venue.venueId);
      notifyError("Unable to cancel job", reason, venue.baseUrl);
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  const downloadReceipt = async () => {
    if (!venue) return notifyWarning("Please connect to a venue first");
    setBusy("receipt");
    try {
      const full = await venue.jobs.get(jobId);
      const m = full.metadata as Record<string, unknown> & typeof full.metadata;
      const receipt = {
        id: m.id ?? jobId,
        operation: (m.op ?? m.operation ?? null) as string | null,
        name: m.name ?? null,
        caller: m.caller ?? null,
        status: m.status ?? null,
        created: m.created ?? null,
        updated: m.updated ?? null,
        input: m.input ?? null,
        output: m.output ?? null,
        error: m.error ?? null,
        venue: venue.venueId,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${abbreviateJobId(jobId).replace(/[^a-zA-Z0-9_-]/g, "")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notifySuccess("Receipt downloaded");
    } catch (err) {
      const { reason } = jobFailure(err, venue.venueId);
      notifyError("Unable to download receipt", reason, venue.baseUrl);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Job actions"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
            data-testid={`job-actions-${jobId}`}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => void rerun()} disabled={busy !== null}>
            <RotateCcw size={14} /> Re-run
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void downloadReceipt()} disabled={busy !== null}>
            <Download size={14} /> Download receipt
          </DropdownMenuItem>
          {isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={busy !== null}
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmCancel(true);
                }}
              >
                <Ban size={14} /> Cancel job
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
            <AlertDialogDescription>
              Job <span className="font-mono">{abbreviateJobId(jobId)}</span> is still running.
              Cancelling stops it and may discard in-flight work. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "cancel"}>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
              disabled={busy === "cancel"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "cancel" ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              Cancel job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
