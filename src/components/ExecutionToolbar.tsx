'use client'

import type { ReactNode } from "react";
import { type JobMetadata, type Venue, isJobFinished, isJobPaused } from "@covia/covia-sdk";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
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
} from "@/components/ui/alert-dialog"
import { PauseCircleIcon, PlayCircle, StopCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn, gtmEvent } from "@/lib/utils";

interface ExecutionToolBarProps {
  jobData: JobMetadata;
  venue?: Venue;
}

interface ConfirmedActionProps {
  /** Lower-case verb: the button's accessible name and the question asked. */
  verb: "cancel" | "pause" | "resume" | "delete";
  icon: ReactNode;
  /** Cancel and delete lose work for good; pause and resume undo each other. */
  irreversible?: boolean;
  className?: string;
  onConfirm: () => void;
}

// One real <button> per action (the shadcn Button) — both triggers chain onto
// it via asChild. Nesting trigger buttons is invalid HTML and breaks hydration.
function ConfirmedAction({ verb, icon, irreversible, className, onConfirm }: ConfirmedActionProps) {
  const label = verb[0].toUpperCase() + verb.slice(1);
  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button aria-label={verb} variant="outline" className={cn("h-8 justify-center text-sm", className)}>
              {icon}{label}
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{label} job</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to {verb} the job?</AlertDialogTitle>
          <AlertDialogDescription>
            {irreversible
              ? "This action cannot be undone."
              : `You can ${verb === "pause" ? "resume" : "pause"} it again afterwards.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Yes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const ExecutionToolbar = ({ jobData, venue }: ExecutionToolBarProps) => {
  const router = useRouter();
  const jobId = jobData.id;
  const isFinished = jobData.status ? isJobFinished(jobData.status) : false;
  const isPaused = jobData.status ? isJobPaused(jobData.status) : false;

  // `event` is the analytics button name — reports key on it, so it stays as is.
  const act = (
    event: string,
    failureTitle: string,
    call: (venue: Venue, jobId: string) => Promise<unknown>,
    onDone: (venue: Venue) => void,
  ) => () => {
    if (!venue || !jobId) return;
    gtmEvent.buttonClick(event, jobId);
    call(venue, jobId)
      .then(() => onDone(venue))
      .catch((err) => notifyError(failureTitle, err, venue.baseUrl));
  };

  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-2 shrink-0">
      {isFinished ? (
        <ConfirmedAction
          verb="delete"
          icon={<Trash2 />}
          irreversible
          onConfirm={act("Delete Job", "Unable to delete job", (v, id) => v.jobs.delete(id),
            (v) => router.push(`/venues/${encodeURIComponent(v.venueId)}/jobs`))}
        />
      ) : (
        <>
          <ConfirmedAction
            verb="cancel"
            icon={<StopCircle />}
            irreversible
            onConfirm={act("Cancel Job", "Unable to cancel job", (v, id) => v.jobs.cancel(id),
              () => notifySuccess("Job cancelled"))}
          />
          {isPaused ? (
            <ConfirmedAction
              verb="resume"
              icon={<PlayCircle />}
              className="bg-primary"
              onConfirm={act("Resume Job", "Unable to resume job", (v, id) => v.jobs.resume(id),
                () => notifySuccess("Job resumed"))}
            />
          ) : (
            <ConfirmedAction
              verb="pause"
              icon={<PauseCircleIcon />}
              onConfirm={act("Pause Job", "Unable to pause job", (v, id) => v.jobs.pause(id),
                () => notifySuccess("Job paused"))}
            />
          )}
        </>
      )}
    </div>
  );
};
