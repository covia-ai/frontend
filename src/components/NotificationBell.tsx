"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { TONE_STYLES } from "@/lib/status";
import { useNotificationLog, type NotificationEntry } from "@/hooks/use-notification-log";
import { useVenues } from "@/hooks/use-venues";
import { KIND_ICONS } from "@/components/NotificationLog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type VenueGroup = { venueId: string | undefined; label: string; entries: NotificationEntry[] };

// Groups newest-first, preserving each entry's relative order (the store's
// `entries` array is already newest-first, so grouping is a stable filter,
// never a re-sort). Venue groups are ordered by their own most-recent entry;
// entries with no venueId (plain notifySuccess/Info/Warning with no
// receipt) collect in a trailing "Other" group rather than being dropped.
function groupByVenue(
  entries: NotificationEntry[],
  venueName: (venueId: string) => string,
): VenueGroup[] {
  const order: (string | undefined)[] = [];
  const byVenue = new Map<string | undefined, NotificationEntry[]>();
  for (const entry of entries) {
    if (!byVenue.has(entry.venueId)) {
      byVenue.set(entry.venueId, []);
      order.push(entry.venueId);
    }
    byVenue.get(entry.venueId)!.push(entry);
  }
  // Push the unscoped ("Other") group, if present, to the end.
  order.sort((a, b) => (a === undefined ? 1 : b === undefined ? -1 : 0));
  return order.map((venueId) => ({
    venueId,
    label: venueId ? venueName(venueId) : "Other",
    entries: byVenue.get(venueId)!,
  }));
}

// TopBar bell + panel over the notification log (#241) — the persistent
// "what happened while I was away" surface the HITL badge (use-hitl.ts) was
// the one existing example of. Grouped by venue, newest first, mark-read on
// click with a deep link to the entry's receipt when it has one.
export function NotificationBell() {
  const router = useRouter();
  const entries = useNotificationLog((state) => state.entries);
  const markRead = useNotificationLog((state) => state.markRead);
  const markAllRead = useNotificationLog((state) => state.markAllRead);
  const venues = useVenues((state) => state.venues);

  const unreadCount = useMemo(() => entries.filter((e) => !e.read).length, [entries]);
  const venueName = useMemo(
    () => (venueId: string) => venues.find((v) => v.venueId === venueId)?.metadata.name ?? venueId,
    [venues],
  );
  const groups = useMemo(() => groupByVenue(entries, venueName), [entries, venueName]);

  const openEntry = (entry: NotificationEntry) => {
    markRead(entry.id);
    if (entry.receiptHref) router.push(entry.receiptHref);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          data-testid="notification-bell-trigger"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent shrink-0"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              data-testid="notification-bell-count"
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold",
                TONE_STYLES.attention.pill,
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-xs text-muted-foreground">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              data-testid="notification-bell-mark-all-read"
              onClick={(e) => { e.stopPropagation(); markAllRead(); }}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {entries.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nothing yet. Job completions, failures, and other updates will show up here.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {groups.map((group, i) => (
              <div key={group.venueId ?? "unscoped"}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="truncate text-[10px] uppercase tracking-wide text-sidebar-foreground/45">
                  {group.label}
                </DropdownMenuLabel>
                {group.entries.map((entry) => (
                  <DropdownMenuItem
                    key={entry.id}
                    data-testid="notification-bell-entry"
                    data-read={entry.read}
                    className="items-start gap-2"
                    onClick={() => openEntry(entry)}
                  >
                    {KIND_ICONS[entry.kind]}
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate", entry.read ? "text-muted-foreground" : "text-foreground font-medium")}>
                        {entry.title}
                      </p>
                      {entry.description && (
                        <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <time className="text-[10px] whitespace-nowrap text-muted-foreground">
                        {formatRelativeTime(new Date(entry.at).toISOString())}
                      </time>
                      {!entry.read && (
                        <span
                          aria-hidden
                          className={cn("h-1.5 w-1.5 rounded-full", TONE_STYLES.attention.dot)}
                        />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile" className="justify-center text-xs text-muted-foreground">
            View all in Profile
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
