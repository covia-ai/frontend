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
  // Idle, not "good": green read as active/healthy and stole emphasis from the
  // agents actually RUNNING (active/blue). Sleeping is a calm, neutral resting
  // state; green stays reserved for genuinely-positive terminal states.
  [AgentStatus.SLEEPING]: "neutral",
  [AgentStatus.SUSPENDED]: "attention",
  [AgentStatus.TERMINATED]: "neutral",
};

// HITL inbox records carry their own vocabulary, but it maps onto the same
// five tones — a request awaiting a person reads "attention", exactly like a
// job sitting in INPUT_REQUIRED.
const HITL_STATUS_TONE: Record<string, StatusTone> = {
  open: "attention",
  answered: "success",
  rejected: "failure",
  // The requester's Job fails on expiry, so it belongs with the failures.
  expired: "failure",
  cancelled: "neutral",
};

export function toneForRunStatus(status?: string): StatusTone {
  return (status && RUN_STATUS_TONE[status as RunStatus]) || "neutral";
}

export function toneForAgentStatus(status?: string): StatusTone {
  return (status && AGENT_STATUS_TONE[status as AgentStatus]) || "neutral";
}

const AGENT_STATUS_DESCRIPTION: Partial<Record<AgentStatus, string>> = {
  [AgentStatus.RUNNING]: "Running — the agent is actively processing work.",
  [AgentStatus.SLEEPING]: "Sleeping — the agent is idle and will run when work arrives or a wake is due.",
  [AgentStatus.SUSPENDED]: "Suspended — processing is paused until the agent is resumed.",
  [AgentStatus.TERMINATED]: "Terminated — the agent cannot process further work.",
};

export function agentStatusDescription(status?: string): string | undefined {
  return status ? AGENT_STATUS_DESCRIPTION[status as AgentStatus] : undefined;
}

export function toneForHitlStatus(status?: string): StatusTone {
  return (status && HITL_STATUS_TONE[status]) || "neutral";
}

// Each tone carries: `text` (foreground), `dot` (status dot), `pill` (badge),
// `surface` (subtle row/hover tint), and `banner` (bordered callout box). All
// state colour in the app routes through here — no surface hand-rolls its own
// green/amber/red. `active` doubles as the "live / streaming" treatment (a
// streaming job is a running job).
export const TONE_STYLES: Record<
  StatusTone,
  { text: string; dot: string; pill: string; surface: string; banner: string; tint: string }
> = {
  active: {
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-600 dark:bg-blue-400",
    pill: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    surface: "bg-blue-500/5 hover:bg-blue-500/10",
    banner: "border border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    tint: "border-blue-500/40 bg-blue-500/10",
  },
  success: {
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-600 dark:bg-green-400",
    pill: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
    surface: "bg-green-500/5 hover:bg-green-500/10",
    banner: "border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950",
    tint: "border-green-500/40 bg-green-500/10",
  },
  attention: {
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
    pill: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
    surface: "bg-amber-500/5 hover:bg-amber-500/10",
    banner: "border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950",
    tint: "border-amber-500/40 bg-amber-500/10",
  },
  failure: {
    text: "text-destructive",
    dot: "bg-destructive",
    pill: "bg-destructive/10 dark:bg-destructive/20 text-destructive",
    surface: "bg-destructive/5 hover:bg-destructive/10",
    banner: "border border-destructive/40 bg-destructive/5",
    tint: "border-destructive/40 bg-destructive/10",
  },
  neutral: {
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    pill: "bg-muted text-muted-foreground",
    surface: "bg-muted/40 hover:bg-muted/60",
    banner: "border border-border bg-muted/30",
    tint: "border-border bg-muted/30",
  },
};

// A magnitude/latency band fill (fast → slow) — deliberately NOT a status tone
// (a slow-but-successful job is not a "failure"). The last band reuses the
// destructive token; the rest are a green→cyan→amber ramp. Consumed by
// `durationFillClass`.
export const MAGNITUDE_FILL = [
  "bg-green-500 dark:bg-green-400",
  "bg-cyan-500 dark:bg-cyan-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-destructive",
] as const;
