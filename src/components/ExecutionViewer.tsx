"use client";

import { useEffect } from "react";
import {
  Check,
  Clock,
  Copy,
  FileInput,
  FileOutput,
  Hash,
  MessageSquare,
  RotateCcw,
  Send,
  Timer,
  X,
} from "lucide-react";
import { RunStatus, isJobFinished } from "@covia/covia-sdk";
import { TbSubtask } from "react-icons/tb";
import { AssetLoadState } from "@/components/AssetLoadState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ExecutionHeader } from "@/components/ExecutionHeader";
import { ExecutionToolbar } from "@/components/ExecutionToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ExecutionChildJobs } from "@/components/execution/ExecutionChildJobs";
import { ExecutionDataTable } from "@/components/execution/ExecutionDataTable";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useExecutionLifecycle } from "@/hooks/use-execution-lifecycle";
import { copyDataToClipBoard, formatDateTime, getExecutionTime } from "@/lib/utils";

function StatusIcon({ status }: { status?: string }) {
  if (status === RunStatus.COMPLETE) return <Check />;
  if (status === RunStatus.FAILED) return <X />;
  if (status === RunStatus.PENDING || status === RunStatus.STARTED) {
    return <RotateCcw />;
  }
  return null;
}

export function ExecutionViewer({
  jobId,
  venueId,
  onNotFound,
}: {
  jobId: string;
  venueId?: string;
  // Fires once when the job turns out not to exist on the resolved venue —
  // e.g. PublicJobViewer redirects back to /jobs, since a venue-less job
  // page follows whichever venue is globally selected and has no "correct"
  // venue to fall back to.
  onNotFound?: () => void;
}) {
  const execution = useExecutionLifecycle({ jobId, venueId });
  const { venue, job, operationAsset } = execution;
  const resolvedVenueId = venue?.venueId ?? venueId ?? "";
  const operationSchema = operationAsset?.metadata?.operation;

  useEffect(() => {
    if (execution.notFound) onNotFound?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution.notFound]);

  return (
    <>
      <TopBar
        venueId={venueId}
        assetOrJobName={job?.name}
        venueName={venue?.metadata.name}
      />
      <ExecutionHeader jobData={job} venueId={resolvedVenueId} />

      {execution.loading && (
        <div className="flex h-64 w-full items-center justify-center">
          <Spinner variant="ellipsis" className="text-primary" size={48} />
        </div>
      )}
      {execution.error && (
        <ErrorDisplay error={execution.error} className="my-4" />
      )}
      <AssetLoadState
        notFound={execution.notFound}
        notFoundTitle="Job Not Found"
        notFoundMessage={`The job ID "${jobId}" does not exist on this venue.`}
      />

      {job && (
        <div className="flex flex-col w-full items-center justify-center">
          <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-full p-4 items-center justify-between">
            <div className="flex flex-col w-full">
              <div className="flex flex-row items-start w-full">
                <div className="flex flex-row items-center space-x-4 py-2 w-1/2">
                  <StatusIcon status={job.status} />
                  <span className="w-28">Status:</span>
                  <StatusBadge status={job.status} kind="job" />

                  {execution.streaming && (
                    <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Streaming
                    </span>
                  )}
                  {!execution.streaming &&
                    job.status &&
                    isJobFinished(job.status) && (
                      <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        Completed
                      </span>
                    )}
                </div>
                <ExecutionToolbar jobData={job} venue={venue} />
              </div>

              <div className="flex flex-row items-center space-x-4 py-2">
                <Hash />
                <span className="w-28">Job ID:</span>
                <span className="text-card-foreground font-mono break-all">
                  {jobId}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="copy job id"
                      onClick={() =>
                        copyDataToClipBoard(jobId, "Job ID copied")
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copy job ID</TooltipContent>
                </Tooltip>
              </div>

              {job.status === RunStatus.INPUT_REQUIRED && (
                <div className="flex flex-col gap-3 py-3 px-4 my-2 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <MessageSquare size={18} />
                    <span className="font-semibold text-sm">
                      This job requires input to continue
                    </span>
                  </div>
                  <Textarea
                    placeholder="Enter your response (text or JSON)..."
                    value={execution.message}
                    onChange={(event) =>
                      execution.setMessage(event.target.value)
                    }
                    className="font-mono text-sm bg-background"
                    rows={3}
                  />
                  <div className="flex flex-row-reverse">
                    <Button
                      size="sm"
                      onClick={() => void execution.sendMessage()}
                      disabled={
                        execution.sendingMessage ||
                        !execution.message.trim()
                      }
                    >
                      <Send size={14} className="mr-1" />
                      {execution.sendingMessage
                        ? "Sending..."
                        : "Send Response"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-row items-center space-x-4 py-2">
                <Clock />
                <span className="w-28">Created Date</span>
                <span className="text-card-foreground">
                  {job.created
                    ? formatDateTime(job.created)
                    : "N/A"}
                </span>
              </div>
              <div className="flex flex-row items-center space-x-4 py-2">
                <Clock />
                <span className="w-28">Updated Date:</span>
                <span className="text-card-foreground">
                  {job.updated
                    ? formatDateTime(job.updated)
                    : "N/A"}
                </span>
              </div>
              <div className="flex flex-row items-center space-x-4 py-2">
                <Timer />
                <span className="w-28">Time:</span>
                <span className="text-card-foreground">
                  {job.created && job.updated
                    ? getExecutionTime(job.created, job.updated)
                    : "N/A"}
                </span>
              </div>

              {job.steps != null && (
                <div className="flex flex-row space-x-4 py-2 w-3/4">
                  <div className="flex flex-row space-x-4 my-2">
                    <TbSubtask size={20} />
                    <span className="w-28">Steps:</span>
                  </div>
                  <ExecutionChildJobs
                    steps={job.steps}
                    venueId={resolvedVenueId}
                  />
                </div>
              )}

              <div className="flex flex-row w-full items-start justify-between space-x-4">
                <div className="flex flex-col py-2 space-x-4 w-1/2">
                  <div className="flex flex-row space-x-4 my-2">
                    <FileInput />
                    <span className="w-28">Input:</span>
                  </div>
                  <ExecutionDataTable
                    value={job.input}
                    schema={operationSchema?.input}
                    direction="input"
                  />
                </div>

                {job.status !== RunStatus.FAILED && (
                  <div className="flex flex-col py-2 space-x-4 w-1/2">
                    <div className="flex flex-row space-x-4 my-2">
                      <FileOutput />
                      <span className="w-28">Output:</span>
                    </div>
                    <ExecutionDataTable
                      value={job.output}
                      schema={operationSchema?.output}
                      direction="output"
                    />
                  </div>
                )}

                {job.status === RunStatus.FAILED && job.error && (
                  <div className="flex flex-row py-2 space-x-4 w-1/2 my-2">
                    <div className="flex flex-row space-x-4">
                      <FileOutput />
                      <span className="w-28">Error:</span>
                    </div>
                    <ErrorDisplay error={job.error} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
