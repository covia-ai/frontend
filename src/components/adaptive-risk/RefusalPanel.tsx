"use client";

import { ShieldX } from "lucide-react";
import type { BeatJobState } from "@/components/demo-kit/BeatCard";

// Beat 3 has two levels, and glossing over that would be dishonest:
//
//   inner  — the assessor's invoke of issue-limit, DENIED by the gate before
//            execution. The denial is the venue's own string and the write
//            never happened.
//   outer  — the agent:request job, which COMPLETEs, because the agent did
//            what it was asked: it reported the refusal verbatim and stopped.
//
// So the beat card's badge reads COMPLETE while the thing being demonstrated
// is a refusal. This panel names that explicitly and shows the denial itself,
// rather than letting a green badge imply the write succeeded.

const DENIAL_MARKER = "Capability denied";

/**
 * The venue's denial string, wherever it surfaced — never reworded.
 *
 * Depth varies: an agent reporting a refused tool call nests it inside its
 * own task envelope (`output.output.error`), while a directly-denied invoke
 * puts it on the job's `error`. Scan rather than assume a shape, so a change
 * to the envelope degrades to "no denial found" rather than a wrong claim.
 */
function findMarked(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;
  if (typeof value === "string") {
    return value.includes(DENIAL_MARKER) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findMarked(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const hit = findMarked(nested, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

export function extractDenial(state: BeatJobState | null): string | null {
  if (!state) return null;
  return findMarked(state.error) ?? findMarked(state.output);
}

export function RefusalPanel({ state }: { state: BeatJobState | null }) {
  const denial = extractDenial(state);
  if (!state) return null;

  if (!denial) {
    // The gate did not refuse. Say so plainly instead of implying it did.
    return (
      <p className="text-xs text-muted-foreground" data-testid="ar-refusal-none">
        No capability denial in this run — the gate did not refuse. Check the
        job record above.
      </p>
    );
  }

  return (
    <div
      className="rounded border border-destructive/60 bg-destructive/5 p-3 flex flex-col gap-2"
      data-testid="ar-refusal"
    >
      <p className="text-sm font-medium flex items-center gap-2">
        <ShieldX className="size-4 text-destructive" aria-hidden="true" />
        The write was refused by the runtime
      </p>
      <pre
        data-testid="ar-refusal-denial"
        className="text-xs whitespace-pre-wrap break-all bg-muted rounded p-2"
      >
        {denial}
      </pre>
      <p className="text-xs text-muted-foreground">
        The model was not persuaded not to write — it was not permitted to. The
        gate ran <span className="font-medium text-foreground">before</span>{" "}
        issue-limit executed, read the shared signal ledger, and denied the
        invocation.
      </p>
      <p className="text-xs text-muted-foreground">
        The agent&apos;s own job above reads COMPLETE because the agent did what it
        was asked: it reported the refusal word for word and stopped. The
        invocation it attempted is the thing that failed, and the decision
        ledger below shows the write never happened.
      </p>
    </div>
  );
}
