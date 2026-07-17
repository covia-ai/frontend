import { cn } from "@/lib/utils";
import { toneForAgentStatus, toneForRunStatus, TONE_STYLES } from "@/lib/status";

interface StatusBadgeProps {
  status?: string;
  kind: "job" | "agent";
  as?: "text" | "dot" | "pill";
  className?: string;
}

// Single rendering of the job/agent status system defined in lib/status —
// replaces three drifted, hand-rolled color switches that used to disagree
// with each other (and lumped CANCELLED in with FAILED).
export function StatusBadge({ status, kind, as = "text", className }: StatusBadgeProps) {
  const tone = kind === "job" ? toneForRunStatus(status) : toneForAgentStatus(status);
  const style = TONE_STYLES[tone];

  if (as === "dot") {
    return <span title={status} className={cn("inline-block h-2 w-2 rounded-full shadow-lg", style.dot, className)} />;
  }

  if (as === "pill") {
    return <span className={cn("px-1.5 py-px rounded-full font-semibold", style.pill, className)}>{status}</span>;
  }

  return <span className={cn("font-medium", style.text, className)}>{status}</span>;
}
