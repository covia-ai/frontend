import { RunStatus, AgentStatus } from "@covia/covia-sdk";

// Five meanings any lifecycle status in this app can carry. Job RunStatus and
// AgentStatus are different enums but map onto the same five tones, so every
// status indicator in the product (job table, agent card, agent explorer)
// reads consistently instead of each surface inventing its own palette.
export type StatusTone = "active" | "success" | "attention" | "failure" | "neutral";

const RUN_STATUS_TONE: Partial<Record<RunStatus, StatusTone>> = {
  [RunStatus.PENDING]: "active",
  [RunStatus.STARTED]: "active",
  [RunStatus.PAUSED]: "active",
  [RunStatus.COMPLETE]: "success",
  // Needs a person to do something — not a failure, so it doesn't share red
  // with FAILED/REJECTED/TIMEOUT the way the old colourForStatus did.
  [RunStatus.INPUT_REQUIRED]: "attention",
  [RunStatus.AUTH_REQUIRED]: "attention",
  [RunStatus.FAILED]: "failure",
  [RunStatus.REJECTED]: "failure",
  [RunStatus.TIMEOUT]: "failure",
  // Terminal but user-initiated, not an error — gets its own neutral tone
  // instead of being lumped in with FAILED.
  [RunStatus.CANCELLED]: "neutral",
};

const AGENT_STATUS_TONE: Partial<Record<AgentStatus, StatusTone>> = {
  [AgentStatus.RUNNING]: "active",
  [AgentStatus.SLEEPING]: "success",
  [AgentStatus.SUSPENDED]: "attention",
  [AgentStatus.TERMINATED]: "neutral",
};

export function toneForRunStatus(status?: string): StatusTone {
  return (status && RUN_STATUS_TONE[status as RunStatus]) || "neutral";
}

export function toneForAgentStatus(status?: string): StatusTone {
  return (status && AGENT_STATUS_TONE[status as AgentStatus]) || "neutral";
}

export const TONE_STYLES: Record<StatusTone, { text: string; dot: string; pill: string }> = {
  active: {
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-600 dark:bg-blue-400",
    pill: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  },
  success: {
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-600 dark:bg-green-400",
    pill: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  },
  attention: {
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
    pill: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  },
  failure: {
    text: "text-destructive",
    dot: "bg-destructive",
    pill: "bg-destructive/10 dark:bg-destructive/20 text-destructive",
  },
  neutral: {
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    pill: "bg-muted text-muted-foreground",
  },
};
