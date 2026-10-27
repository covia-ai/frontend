import { Venue, fetchWithError } from "@covia/covia-sdk";

// {handle, op, time, track, by?, input?, description?, created?, repeat?,
// lastFired?, lastJob?} — the grid scheduler's event shape (covia#408, with
// the descriptive fields from covia 0.10, covia#583): `time` is the next fire
// time in epoch ms; a recurring event also carries `repeat` (fixed interval
// only — cron-style calendar expressions are still covia#408 stage 2),
// `lastFired`, and, when tracked, `lastJob` (a Job id — read
// GET /api/v1/jobs/{id} for that fire's outcome). One-shot events carry none
// of the recurrence fields. `by` is whoever scheduled it (the account, or one
// of its agents), `input` is shown with the operation's secret fields hidden,
// as job records show it, and `description` is the scheduler's own free text.
// Venues before 0.10 send none of those four.
export type ScheduledEvent = {
  handle: string;
  op: string;
  time: number;
  track: boolean;
  by?: string;
  input?: unknown;
  description?: string;
  created?: number;
  repeat?: { every: number };
  lastFired?: number;
  lastJob?: string;
};

/** The venue refuses a longer description (covia's MAX_DESCRIPTION_CHARS). */
export const MAX_SCHEDULE_DESCRIPTION = 500;

// The agent an agent:trigger wake targets, read from the event's input — what
// SchedulePickerDialog sends from an agent's page. Only a bare id names an
// agent of the caller's own; anything else is shown as the operation alone.
export function wakeTargetAgent(event: Pick<ScheduledEvent, "op" | "input">): string | null {
  if (event.op !== "agent:trigger" && event.op !== "v/ops/agent/trigger") return null;
  const agentId = (event.input as { agentId?: unknown } | null | undefined)?.agentId;
  return typeof agentId === "string" && agentId !== "" && !agentId.includes("/") ? agentId : null;
}

// Fixed-interval cadence presets offered by SchedulePickerDialog, in
// milliseconds — the single source of truth for preset-to-repeat.every
// mapping so the picker and any future display code can't drift apart.
export const CADENCE_PRESETS = {
  hourly: 3_600_000,
  daily: 86_400_000,
  weekly: 604_800_000,
} as const;

export type CadencePreset = keyof typeof CADENCE_PRESETS;

// GET /api/v1/schedules — job-free listing of the caller's pending scheduled
// events (including ones queued by their agents), soonest first (covia#369).
// No SDK wrapper exists yet (covia-sdk has no SchedulerManager), so this
// calls the raw endpoint the same way lib/venue-auth-probe.ts does for other
// authenticated, job-free reads — invoking scheduler:list via
// venue.operations.run() would create a Job for the invocation itself,
// violating "reads must not create jobs".
export async function listScheduledEvents(venue: Venue): Promise<ScheduledEvent[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  await venue.auth.apply(headers, venue.venueId);
  const data = await fetchWithError<{ events: ScheduledEvent[] }>(
    `${venue.baseUrl}/api/v1/schedules`,
    { headers },
  );
  return data.events ?? [];
}
