"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_STYLES } from "@/lib/status";
import { useHitlOpenCount } from "@/hooks/use-hitl";

// Carried in the TopBar, which renders on every page — so a request waiting on
// the user is visible even when the sidebar is collapsed to icons or closed
// altogether on mobile. Silent when nothing is pending: an always-on icon that
// usually means "nothing to do" trains people to ignore it.
export function HitlIndicator() {
  const openCount = useHitlOpenCount();
  if (openCount < 1) return null;

  const summary = `${openCount} request${openCount === 1 ? "" : "s"} awaiting your decision`;

  return (
    <Link
      href="/hitl"
      aria-label={summary}
      title={summary}
      data-testid="hitl-topbar-indicator"
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent shrink-0"
    >
      <Inbox size={18} />
      <span
        data-testid="hitl-topbar-count"
        className={cn(
          "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold",
          TONE_STYLES.attention.pill,
        )}
      >
        {openCount > 99 ? "99+" : openCount}
      </span>
    </Link>
  );
}
