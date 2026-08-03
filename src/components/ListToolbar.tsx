import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListToolbarProps {
  /** Top row (right-aligned): page-level action buttons — Create, Filters,
   *  Refresh, etc. */
  actions: ReactNode;
  /** Bottom row, grouped in a pill with `pagination`: row-count text, e.g.
   *  "Page 1 : Showing 8 of 134". */
  summary?: ReactNode;
  /** Bottom row: pagination control, paired with `summary` in the same pill. */
  pagination?: ReactNode;
  /** Callers that don't already space this block via a parent gap (e.g. a
   *  plain container right under TopBar) pass "mt-4" here. */
  className?: string;
}

// Shared toolbar for list pages (Jobs, Assets, Operations, HITL): two
// right-aligned rows — action buttons on top (Create/Filters/Refresh), and
// a count+pagination group below — instead of one row that either splits
// across both sides of the page or wraps unpredictably when it runs out
// of room.
export function ListToolbar({ actions, summary, pagination, className }: ListToolbarProps) {
  const hasNavRow = Boolean(summary) || Boolean(pagination);
  return (
    <div className={cn("flex flex-col items-end w-full gap-2", className)}>
      <div className="flex flex-row flex-wrap items-center justify-end gap-2">
        {actions}
      </div>
      {hasNavRow && (
        <div className="flex flex-row items-center gap-3">
          {summary && (
            <span className="text-muted-foreground text-xs whitespace-nowrap pr-2">{summary}</span>
          )}
          {pagination}
        </div>
      )}
    </div>
  );
}
