import { Venue, fetchWithError } from "@covia/covia-sdk";

// {handle, op, time, track, repeat?, lastFired?, lastJob?} — the grid
// scheduler's event shape as of covia 0.9.6 (covia#408): `time` is the next
// fire time in epoch ms; a recurring event also carries `repeat` (fixed
// interval only — cron-style calendar expressions are still covia#408 stage
// 2), `lastFired`, and, when tracked, `lastJob` (a Job id — read
// GET /api/v1/jobs/{id} for that fire's outcome). One-shot events carry none
// of the recurrence fields.
export type ScheduledEvent = {
  handle: string;
  op: string;
  time: number;
  track: boolean;
  repeat?: { every: number };
  lastFired?: number;
  lastJob?: string;
};

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
  venue.auth.apply(headers, venue.venueId);
  const data = await fetchWithError<{ events: ScheduledEvent[] }>(
    `${venue.baseUrl}/api/v1/schedules`,
    { headers },
  );
  return data.events ?? [];
}
