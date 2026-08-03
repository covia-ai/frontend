"use client";

import { ShieldAlert } from "lucide-react";

// A permanent part of every demo page, not a dismissible note: a reviewer who
// catches an unlabelled simulation discards everything else on the page. Each
// demo supplies its own points; the shape stays the same so a reader learns
// where to look once.
export function HonestyPanel({ points }: { points: string[] }) {
  return (
    <aside
      role="note"
      aria-label="What is real in this demo"
      data-testid="demo-honesty"
      className="rounded-lg border bg-muted/40 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">What is real here, and what is not</h3>
      </div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </aside>
  );
}
