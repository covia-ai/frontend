"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// One box for "here is what the venue actually holds". Every beat's evidence
// — a ledger, a decision, the rule that refused something — is the same
// shape: a title, a count, some rows read job-free, and a refresh. Four
// near-identical panels collapsed into this.

export type EvidenceRow = {
  key: string;
  /** Rendered monospace in a muted block. Strings pass through; objects are stringified. */
  value: unknown;
  /** Optional label shown before the value. */
  label?: string;
};

export function Evidence({
  title,
  summary,
  rows,
  emptyText,
  onRefresh,
  refreshing,
  testId,
  children,
}: {
  title: string;
  /** Short parenthetical after the title, e.g. "12 signal records". */
  summary?: string;
  rows?: EvidenceRow[];
  emptyText?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  testId: string;
  children?: React.ReactNode;
}) {
  const items = rows ?? [];
  return (
    <div className="rounded border p-3 flex flex-col gap-2" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {title}
          {summary && (
            <span className="text-muted-foreground font-normal"> ({summary})</span>
          )}
        </p>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
          </Button>
        )}
      </div>
      {items.map((row) => (
        <pre
          key={row.key}
          data-testid={`${testId}-${row.key}`}
          className="text-xs whitespace-pre-wrap break-all bg-muted rounded p-2"
        >
          {row.label ? `${row.label}: ` : ""}
          {typeof row.value === "string" ? row.value : JSON.stringify(row.value)}
        </pre>
      ))}
      {items.length === 0 && emptyText && (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
      {children}
    </div>
  );
}
