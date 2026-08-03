import { toast } from "sonner";
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

export function notifySuccess(title: string, options?: NotifyOptions): void {
  recordNotification("success", title, options?.description);
  toast.success(title, options);
}

export function notifyInfo(title: string, options?: NotifyOptions): void {
  recordNotification("info", title, options?.description);
  toast.info(title, options);
}

export function notifyWarning(title: string, options?: NotifyOptions): void {
  recordNotification("warning", title, options?.description);
  toast.warning(title, options);
}

// Rich, copyable error toast (formerly lib/toast-error.ts). Raw fetch
// failures surface as just "Failed to fetch" with no target, so callers pass
// what was being reached (e.g. the venue baseUrl) and the helper names it.
export function notifyError(title: string, err?: unknown, target?: string): void {
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
  toast.error(title, {
    description: detail,
    duration: 15000,
    closeButton: true,
    action: {
      label: "Copy",
      onClick: () =>
        navigator.clipboard.writeText(detail ? `${title}: ${detail}` : title),
    },
  });
}
