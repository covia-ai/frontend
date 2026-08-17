"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Venue } from "@covia/covia-sdk";
import { errorMessage } from "@/lib/errors";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { useWatchedJobs } from "@/hooks/use-watched-jobs";

type JobResult = { id?: string } | null | undefined;

type ExecuteJobOptions = {
  action: () => Promise<JobResult>;
  failureTitle: string;
  missingJobMessage?: string;
  onError?: (message: string) => void;
  onSuccess?: (jobId: string) => void;
};

export function useJobExecution(venue?: Venue | null) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  const execute = useCallback(async ({
    action,
    failureTitle,
    missingJobMessage = "The operation completed without returning a job ID",
    onError,
    onSuccess,
  }: ExecuteJobOptions): Promise<string | null> => {
    if (!venue) return null;
    setRunning(true);
    onError?.("");
    try {
      const result = await action();
      if (!result?.id) {
        notifyWarning(missingJobMessage);
        onError?.(missingJobMessage);
        return null;
      }
      onSuccess?.(result.id);
      // #241: ambient completion notification even if the user navigates
      // away before this job finishes — see use-watched-jobs.ts.
      useWatchedJobs.getState().watch(venue.venueId, result.id);
      router.push(`/venues/${encodeURIComponent(venue.venueId)}/jobs/${result.id}`);
      return result.id;
    } catch (error: unknown) {
      const { reason, jobHref } = jobFailure(error, venue.venueId);
      notifyError(failureTitle, reason, venue.baseUrl, jobHref);
      onError?.(errorMessage(reason, failureTitle));
      return null;
    } finally {
      setRunning(false);
    }
  }, [router, venue]);

  return { execute, running };
}
