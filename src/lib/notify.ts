import { toast } from "sonner";
import { JobFailedError } from "@covia/covia-sdk";
import { recordNotification } from "@/hooks/use-notification-log";

// Every user-facing notification goes through these helpers — never bare
// sonner toast() (#204). The rules they encode:
//  - Failures never discard the caught error: notifyError takes the error,
//    puts its message in the description, names unreachable targets, stays up
//    long enough to read, and offers one-click copy of the full detail.
//  - Success/warning/info use sonner's coloured variants so the outcome is
//    readable at a glance, not only from the text.
//  - Failure titles read "Unable to <verb> <object>".
//  - Everything is recorded to the session notification log (Profile page).

type NotifyOptions = {
  description?: string;
  duration?: number;
  closeButton?: boolean;
};

// Job failure messages (e.g. a chat send that dies mid-transition) can run
// to several hundred characters of adapter-specific detail — too long to
// dump into a toast. Truncate to a preview and let "View job" open the job
// detail page, which renders the full error (ExecutionViewer/ErrorDisplay).
const JOB_ERROR_PREVIEW_LENGTH = 80;

export function notifySuccess(title: string, options?: NotifyOptions): void {
  recordNotification("success", title, options?.description);
  toast.success(title, { closeButton: true, ...options });
}

export function notifyInfo(title: string, options?: NotifyOptions): void {
  recordNotification("info", title, options?.description);
  toast.info(title, { closeButton: true, ...options });
}

export function notifyWarning(title: string, options?: NotifyOptions): void {
  recordNotification("warning", title, options?.description);
  toast.warning(title, { closeButton: true, ...options });
}

// Every job-invoking SDK call (operations.run, agent chat/suspend/resume/
// delete/renameSession, workspace.write/delete, secrets.set, ...) can throw
// JobFailedError, whose .message is only "Job <id> STATUS: <reason>" — the
// id/status prefix is noise once "View job" already names the job. Call this
// in a catch block before notifyError to get a toast-ready {reason, jobHref}
// pair: reason leads with the real text, jobHref links to the job record.
//
// Also handles the pre-unwrapped shape some call sites use (e.g. lib/hitl.ts
// respondToHitl): `new Error(realReason, { cause: originalJobFailedError })`
// — reason is used as-is (already clean) and jobHref is pulled from `cause`.
export function jobFailure(err: unknown, venueId?: string): { reason: unknown; jobHref?: string } {
  const wrapped =
    err instanceof Error && !(err instanceof JobFailedError) && err.cause instanceof JobFailedError
      ? err.cause
      : undefined;
  const failed = err instanceof JobFailedError ? err : wrapped;
  if (!failed) return { reason: err, jobHref: undefined };

  const jobHref =
    failed.jobData.id && venueId
      ? `/venues/${encodeURIComponent(venueId)}/jobs/${failed.jobData.id}`
      : undefined;
  const reason =
    wrapped !== undefined ? err // already a clean Error — reuse it
      : typeof failed.jobData.error === "string" ? new Error(failed.jobData.error)
      : err;
  return { reason, jobHref };
}

// Rich, copyable error toast (formerly lib/toast-error.ts). Raw fetch
// failures surface as just "Failed to fetch" with no target, so callers pass
// what was being reached (e.g. the venue baseUrl) and the helper names it.
// `jobHref`: pass when `err` is a job failure with a viewable job detail
// page (e.g. JobFailedError) — the description is truncated to a preview
// and a "View job" action links there instead of dumping the full message
// inline; "Copy" still copies the untruncated text.
export function notifyError(
  title: string,
  err?: unknown,
  target?: string,
  jobHref?: string,
): void {
  const message =
    err === undefined || err === null
      ? undefined
      : ((err as { message?: string })?.message ?? String(err));
  const isNetworkFailure =
    message !== undefined && /failed to fetch|load failed|networkerror/i.test(message);
  const detail =
    isNetworkFailure && target
      ? `${message} — could not reach ${target}. Is the venue running and reachable from this browser?`
      : message;
  recordNotification("error", title, detail);
  const preview =
    jobHref && detail && detail.length > JOB_ERROR_PREVIEW_LENGTH
      ? `${detail.slice(0, JOB_ERROR_PREVIEW_LENGTH)}…`
      : detail;
  toast.error(title, {
    description: preview,
    duration: 15000,
    closeButton: true,
    action: jobHref
      ? { label: "View job", onClick: () => { window.location.href = jobHref; } }
      : {
          label: "Copy",
          onClick: () =>
            navigator.clipboard.writeText(detail ? `${title}: ${detail}` : title),
        },
    cancel: jobHref && detail
      ? {
          label: "Copy",
          onClick: () =>
            navigator.clipboard.writeText(`${title}: ${detail}`),
        }
      : undefined,
  });
}
