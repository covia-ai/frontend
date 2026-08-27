"use client";

import { useNotificationLog, type NotificationKind } from "@/hooks/use-notification-log";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";

// Shared with NotificationBell.tsx (#241) so the two surfaces read the same.
export const KIND_ICONS: Record<NotificationKind, React.ReactNode> = {
  success: <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />,
  error: <CircleAlert size={14} className="text-destructive shrink-0 mt-0.5" />,
  warning: <TriangleAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />,
  info: <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />,
};

// The full notification history (Profile page) — entries come from the
// notify helpers and persist across reloads/tab closes (#241). See also
// NotificationBell.tsx, the TopBar's grouped/mark-read panel over the same
// store.
export function NotificationLog() {
  const entries = useNotificationLog((state) => state.entries);
  const clear = useNotificationLog((state) => state.clear);

  return (
    <div className="border rounded-lg p-4 space-y-4" data-testid="notification-log">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bell size={16} className="text-blue-500" />
          Notifications
          {entries.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {entries.length}
            </span>
          )}
        </h3>
        {entries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            data-testid="notification-log-clear"
            onClick={clear}
          >
            Clear
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing yet. Toasts shown while you work will be listed here.
        </p>
      ) : (
        <ol className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              data-testid="notification-entry"
              data-kind={entry.kind}
              className="flex items-start gap-2 text-sm"
            >
              {KIND_ICONS[entry.kind]}
              <div className="flex-1 min-w-0">
                <p className="text-foreground">{entry.title}</p>
                {entry.description && (
                  <p className="text-xs text-muted-foreground break-words">
                    {entry.description}
                  </p>
                )}
              </div>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(entry.at).toLocaleTimeString()}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
