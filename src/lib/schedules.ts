import { Venue, fetchWithError } from "@covia/covia-sdk";

// {handle, op, time} — the grid scheduler's full event shape today (one-shot
// only: `time` is a single absolute fire time in epoch ms, no cron/recurrence
// and no execution history — see covia's GRID_SCHEDULER.md §9 and covia#407).
export type ScheduledEvent = {
  handle: string;
  op: string;
  time: number;
};

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
