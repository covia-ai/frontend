"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { listScheduledEvents, type ScheduledEvent } from "@/lib/schedules";
import { formatCountdown, formatDateTime, formatInterval, formatRelativeTime, gtmEvent } from "@/lib/utils";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { CalendarClock, PlayCircle, Repeat, XCircle } from "lucide-react";

interface ScheduledListProps {
  venueId?: string;
}

// The events list is small (a caller's pending schedules, not a job-history
// scale collection) and self-pruning as events fire or get cancelled, so a
// plain periodic re-fetch is enough — no windowed slicing like JobList's job
// history needs.
const LIST_REFRESH_MS = 15000;
// Countdown re-render only — a local tick, no network. Kept separate from
// the list refresh above so the "in Xm Ys" text stays live without re-fetching.
const COUNTDOWN_TICK_MS = 1000;

export function ScheduledList({ venueId }: ScheduledListProps = {}) {
  const {
    data: events,
    loading,
    error,
    run: runQuery,
    reset: resetQuery,
  } = useLatestQuery<ScheduledEvent[]>([]);
  const resolvedVenue = useResolvedVenueContext(venueId);
  const { venue } = resolvedVenue;
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");
  const [, setTick] = useState(0);
  const [actioning, setActioning] = useState<string | null>(null);

  const jobHref = useCallback(
    (jobId: string) =>
      venueId ? `/venues/${encodeURIComponent(venue?.venueId ?? "")}/jobs/${jobId}` : `/job/${jobId}`,
    [venueId, venue],
  );

  // scheduler:list only reports the target `op` (a catalog path or asset id,
  // per AssetCard's operations-link handling) — never the agent an
  // agent:trigger wake targets, since that lives in the event's `input`
  // which the list endpoint doesn't surface. So this always links the
  // operation itself; an agent wake links to the agent:trigger adapter.
  const opHref = useCallback(
    (op: string) =>
      venueId
        ? `/venues/${encodeURIComponent(venue?.venueId ?? "")}/operations/${op}`
        : `/operation/${op}`,
    [venueId, venue],
  );

  const fetchEvents = useCallback(() => {
    if (!venue || venueStatus !== "ready") {
      resetQuery();
      return Promise.resolve();
    }
    return runQuery(() => listScheduledEvents(venue));
  }, [venue, venueStatus, resetQuery, runQuery]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (venueStatus !== "ready") return;
    const id = setInterval(() => void fetchEvents(), LIST_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchEvents, venueStatus]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, []);

  function cancelEvent(handle: string) {
    if (!venue) return;
    setActioning(handle);
    gtmEvent.buttonClick("Cancel Schedule", handle);
    venue.operations
      .run("v/ops/scheduler/cancel", { handle })
      .then(() => {
        notifySuccess("Schedule cancelled");
        void fetchEvents();
      })
      .catch((err) => notifyError("Unable to cancel schedule", err))
      .finally(() => setActioning(null));
  }

  function triggerEvent(handle: string) {
    if (!venue) return;
    setActioning(handle);
    gtmEvent.buttonClick("Trigger Schedule Now", handle);
    venue.operations
      .run("v/ops/scheduler/trigger", { handle })
      .then(() => {
        notifySuccess("Triggered now");
        void fetchEvents();
      })
      .catch((err) => notifyError("Unable to trigger schedule", err))
      .finally(() => setActioning(null));
  }

  if (venueStatus !== "ready") {
    return (
      <VenueResolutionState
        status={venueStatus}
        error={resolvedVenue.error}
        icon={CalendarClock}
        subject="Scheduled events"
        venueId={venueId}
      />
    );
  }

  return (
    <div className="flex min-h-[45vh] flex-col items-center w-full">
      {error && <ErrorDisplay error={error} className="mb-4 w-full" />}
      <div className="w-full min-h-[45vh] border border-border rounded-lg shadow-md overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center min-h-[45vh] w-full">
            <Spinner variant="ellipsis" className="text-primary" size={40} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary rounded-full text-secondary-foreground">
                <TableCell className="text-left">Operation</TableCell>
                <TableCell className="text-left">Cadence</TableCell>
                <TableCell className="text-left">Fires At</TableCell>
                <TableCell className="text-left">Next Run</TableCell>
                <TableCell className="text-left">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b!">
              {events.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-[38vh] text-center text-muted-foreground">
                    No scheduled events
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.handle}>
                    <TableCell className="font-mono">
                      <Link href={opHref(event.op)} className="hover:underline">
                        {event.op}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {event.repeat ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1">
                              <Repeat className="size-3.5 text-muted-foreground" />
                              {formatInterval(event.repeat.every)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {event.lastFired ? (
                              <>
                                Last fired {formatRelativeTime(new Date(event.lastFired).toISOString())}
                                {event.lastJob && (
                                  <>
                                    {" — "}
                                    <Link
                                      href={jobHref(event.lastJob)}
                                      className="underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      view job
                                    </Link>
                                  </>
                                )}
                              </>
                            ) : (
                              "Not fired yet"
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">Once</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(event.time)}</TableCell>
                    <TableCell>{formatCountdown(event.time)}</TableCell>
                    <TableCell>
                      <div className="flex flex-row items-center gap-2">
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  aria-label="trigger now"
                                  role="button"
                                  variant="outline"
                                  disabled={actioning === event.handle}
                                  className="text-xs justify-center h-8 text-sm"
                                >
                                  <PlayCircle />
                                  Trigger Now
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Fire this event now</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Trigger this scheduled event now?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {event.op} will run immediately instead of waiting for its scheduled
                                time
                                {event.repeat
                                  ? ", then stay scheduled at its next fire time."
                                  : ", then be removed from the schedule."}{" "}
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No</AlertDialogCancel>
                              <AlertDialogAction onClick={() => triggerEvent(event.handle)}>
                                Yes
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  aria-label="cancel"
                                  role="button"
                                  variant="outline"
                                  disabled={actioning === event.handle}
                                  className="text-xs justify-center h-8 text-sm"
                                >
                                  <XCircle />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Cancel this scheduled event</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this scheduled event?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {event.op} will be removed before it fires. This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelEvent(event.handle)}>
                                Yes
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
