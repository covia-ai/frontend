"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { RunStatus, type JobMetadata } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { TypedResultRenderer } from "@/components/typed-result/TypedResultRenderer";
import {
  classifyResponseShape,
  declaredResponseSchema,
  requestResultValue,
  valueFitsShape,
} from "@/lib/response-schema";
import { jobPath } from "@/lib/routes";

// A finished job never changes, so its record is read once per venue and
// reused for every later render of the transcript.
const finishedJobs = new Map<string, JobMetadata>();

const isFinished = (status: unknown) =>
  status === RunStatus.COMPLETE || status === RunStatus.FAILED || status === RunStatus.CANCELLED;

type Loaded = { key: string; job: JobMetadata | null };

/**
 * The typed result of an agent request, shown under its Task turn in the chat
 * (#240). The transcript records the request and the agent's turns but not
 * the declared contract; that lives on the request job (`input.responseSchema`,
 * covia#376), which the turn links to by `jobId`. Reads the job job-free and
 * renders its output through the typed-result registry once it completes
 * with a value of the declared shape. Renders nothing otherwise: an untyped
 * request, one still running, or one the agent ended with a plain reply.
 *
 * `revision` changes whenever the transcript does; an unfinished job is
 * re-read then, since a task settling is what adds the next turns.
 */
export function TaskTypedResult({ jobId, revision }: { jobId: string; revision: number }) {
  const venue = useAuthenticatedVenue();
  const key = venue ? `${venue.venueId}:${jobId}` : null;
  const query = useLatestQuery<Loaded | null>(null);
  const { run } = query;

  useEffect(() => {
    if (!venue || !key) return;
    if (finishedJobs.has(key)) return;
    void run(async () => {
      const { metadata } = await venue.jobs.get(jobId);
      if (isFinished(metadata.status)) finishedJobs.set(key, metadata);
      return { key, job: metadata };
    });
  }, [venue, key, jobId, revision, run]);

  const job = (key && finishedJobs.get(key)) || (query.data?.key === key ? query.data.job : null);
  if (!job || job.status !== RunStatus.COMPLETE) return null;
  const declared = declaredResponseSchema(job.input);
  if (!declared) return null;
  const value = requestResultValue(job.output);
  if (!valueFitsShape(classifyResponseShape(declared.schema), value)) return null;

  return (
    <div data-testid="task-typed-result" className="mb-6 rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Task result
        </span>
        <Link
          href={jobPath(undefined, jobId)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink size={12} /> Open job
        </Link>
      </div>
      <TypedResultRenderer value={value} schema={declared.schema} strict={declared.strict} />
    </div>
  );
}
