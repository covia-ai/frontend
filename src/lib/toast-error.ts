import { toast } from "sonner";

// Rich, copyable error toast. Raw fetch failures surface as just
// "Failed to fetch" with no target, so callers pass what was being reached
// (e.g. the venue baseUrl) and the helper names it. Errors stay up long
// enough to read, can be dismissed, and offer one-click copy of the full
// detail for pasting into an issue or chat.
export function toastError(title: string, err: unknown, target?: string) {
  const message = (err as { message?: string })?.message ?? String(err);
  const isNetworkFailure = /failed to fetch|load failed|networkerror/i.test(message);
  const detail = isNetworkFailure && target
    ? `${message} — could not reach ${target}. Is the venue running and reachable from this browser?`
    : message;
  toast.error(title, {
    description: detail,
    duration: 15000,
    closeButton: true,
    action: {
      label: "Copy",
      onClick: () => navigator.clipboard.writeText(`${title}: ${detail}`),
    },
  });
}
