"use client";

import { useEffect, type ReactNode } from "react";
import {
  Clock,
  Copy,
  FileInput,
  FileOutput,
  Fingerprint,
  Hash,
  Layers,
  MessageSquare,
  Send,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { RunStatus, isJobFinished } from "@covia/covia-sdk";
import { AssetLoadState } from "@/components/AssetLoadState";
import { DidDisplay } from "@/components/DidDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ExecutionToolbar } from "@/components/ExecutionToolbar";
import { ExecutionChildJobs } from "@/components/execution/ExecutionChildJobs";
import { ExecutionDataTable } from "@/components/execution/ExecutionDataTable";
import { TypedResultRenderer } from "@/components/typed-result/TypedResultRenderer";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useExecutionLifecycle } from "@/hooks/use-execution-lifecycle";
import { cn, copyDataToClipBoard, formatDateTime, getExecutionTime } from "@/lib/utils";
import {
  operationVisual,
  statusVisual,
  abbreviateJobId,
  jobDurationMs,
  durationFillClass,
} from "@/lib/job-visuals";

/** A small labelled fact tile for the at-a-glance strip. */
function MetaTile({ icon: Icon, label, children, spin }: {
  icon: LucideIcon; label: string; children: ReactNode; spin?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={13} className={cn(spin && "animate-spin")} /> {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

/** A titled content panel (input, output, error, provenance…). */
function Panel({ icon: Icon, title, tone, children }: {
  icon: LucideIcon; title: string; tone?: "error"; children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card", tone === "error" && "border-destructive/40")}>
      <div className={cn(
        "flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold",
        tone === "error" ? "bg-destructive/5 text-destructive" : "bg-muted/40 text-foreground",
      )}>
        <Icon size={15} /> {title}
      </div>
      <div className="overflow-x-auto p-4">{children}</div>
    </div>
  );
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

  const op = job ? operationVisual(job) : null;
  const sv = job ? statusVisual(job.status) : null;
  const ms = job ? jobDurationMs(job) : null;
  const failed = job?.status === RunStatus.FAILED;
  const finished = job?.status ? isJobFinished(job.status) : false;

  return (
    <>
      <TopBar venueId={venueId} assetOrJobName={job?.name} venueName={venue?.metadata.name} />

      {execution.loading && (
        <div className="flex h-64 w-full items-center justify-center">
          <Spinner variant="ellipsis" className="text-primary" size={48} />
        </div>
      )}
      {execution.error && <ErrorDisplay error={execution.error} className="my-4" />}
      <AssetLoadState
        notFound={execution.notFound}
        notFoundTitle="Job Not Found"
        notFoundMessage={`The job ID "${jobId}" does not exist on this venue.`}
      />

      {job && op && sv && (
        <div className="mx-auto w-full max-w-5xl space-y-4 py-4">
          {/* Hero */}
          <div className={cn("rounded-xl border bg-card p-5 shadow-sm", failed && "border-destructive/40")}>
            <div className="flex items-start gap-4">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", op.className)}>
                <op.Icon size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="truncate text-xl font-semibold">{job.name ?? "Operation"}</h1>
                  <StatusBadge status={job.status} kind="job" />
                  {execution.streaming && (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> Streaming
                    </span>
                  )}
                </div>
                {job.operation && (
                  <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{job.operation}</div>
                )}
                <button
                  type="button"
                  onClick={() => copyDataToClipBoard(jobId, "Job ID copied")}
                  className="group mt-2 inline-flex items-center gap-1 rounded font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary"
                >
                  {abbreviateJobId(jobId)}
                  <Copy size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
              <ExecutionToolbar jobData={job} venue={venue} />
            </div>
          </div>

          {/* At a glance */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetaTile icon={sv.Icon} label="Status" spin={sv.spin}>
              <span className={cn("capitalize", sv.textClass)}>{(job.status ?? "unknown").toLowerCase()}</span>
            </MetaTile>
            <MetaTile icon={Timer} label="Duration">
              {ms != null ? (
                <span className="flex items-center gap-2">
                  <span className={cn("inline-block size-2 rounded-full", durationFillClass(ms))} />
                  {getExecutionTime(job.created ?? "", job.updated ?? "")}
                </span>
              ) : finished ? "—" : (
                <span className="italic text-muted-foreground">
                  {job.created ? `${getExecutionTime(job.created, new Date().toISOString())} so far` : "running"}
                </span>
              )}
            </MetaTile>
            <MetaTile icon={Clock} label="Started">{job.created ? formatDateTime(job.created) : "—"}</MetaTile>
            <MetaTile icon={Layers} label="Kind"><span className="capitalize">{op.kind}</span></MetaTile>
          </div>

          {/* Awaiting input */}
          {job.status === RunStatus.INPUT_REQUIRED && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <MessageSquare size={18} />
                <span className="text-sm font-semibold">This job is waiting on you to continue</span>
              </div>
              <Textarea
                placeholder="Enter your response (text or JSON)..."
                value={execution.message}
                onChange={(e) => execution.setMessage(e.target.value)}
                className="bg-background font-mono text-sm"
                rows={3}
              />
              <div className="flex flex-row-reverse">
                <Button size="sm" onClick={() => void execution.sendMessage()} disabled={execution.sendingMessage || !execution.message.trim()}>
                  <Send size={14} className="mr-1" />
                  {execution.sendingMessage ? "Sending..." : "Send Response"}
                </Button>
              </div>
            </div>
          )}

          {/* Steps */}
          {job.steps != null && (
            <Panel icon={Layers} title="Steps">
              <ExecutionChildJobs steps={job.steps} venueId={resolvedVenueId} />
            </Panel>
          )}

          {/* Input / Output / Error */}
          <div className="grid gap-4 md:grid-cols-2">
            <Panel icon={FileInput} title="Input">
              <ExecutionDataTable value={job.input} schema={operationSchema?.input} direction="input" />
            </Panel>
            {failed ? (
              <Panel icon={FileOutput} title="Error" tone="error">
                {job.error ? <ErrorDisplay error={job.error} /> : <span className="text-sm text-muted-foreground">No error detail was recorded.</span>}
              </Panel>
            ) : (
              <Panel icon={FileOutput} title="Output">
                {job.responseSchema ? (
                  <TypedResultRenderer value={job.output} schema={job.responseSchema} strict={job.strict === true} />
                ) : (
                  <ExecutionDataTable value={job.output} schema={operationSchema?.output} direction="output" />
                )}
              </Panel>
            )}
          </div>

          {/* Provenance — Covia jobs are governed, identified records */}
          <Panel icon={ShieldCheck} title="Provenance">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Fingerprint size={15} className="shrink-0 text-muted-foreground" />
                <span className="w-24 shrink-0 text-muted-foreground">Called by</span>
                {job.caller ? <DidDisplay value={job.caller} /> : <span className="text-muted-foreground">unknown</span>}
              </div>
              <div className="flex items-center gap-3">
                <Hash size={15} className="shrink-0 text-muted-foreground" />
                <span className="w-24 shrink-0 text-muted-foreground">Job ID</span>
                <span className="break-all font-mono text-xs">{jobId}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="copy job id" onClick={() => copyDataToClipBoard(jobId, "Job ID copied")} className="text-muted-foreground hover:text-foreground">
                      <Copy size={13} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copy job ID</TooltipContent>
                </Tooltip>
              </div>
              {job.operation && (
                <div className="flex items-center gap-3">
                  <Layers size={15} className="shrink-0 text-muted-foreground" />
                  <span className="w-24 shrink-0 text-muted-foreground">Operation</span>
                  <span className="break-all font-mono text-xs text-primary">{job.operation}</span>
                </div>
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                Every job on Covia is a governed record with a verifiable receipt, acting under the caller&apos;s own capabilities.
              </p>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
