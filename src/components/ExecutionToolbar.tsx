'use client'

import {  JobMetadata, Venue, isJobFinished, isJobPaused } from "@covia/covia-sdk";

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
import { PauseCircleIcon, StopCircle, Trash2 }from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";

interface ExecutionToolBarProps {
  jobData: JobMetadata;
  venue?: Venue;
}
export const ExecutionToolbar = ({ jobData, venue }: ExecutionToolBarProps) => {

     const router = useRouter()
      const isFinished = jobData.status
        ? isJobFinished(jobData.status)
        : false;
      const isPaused = jobData.status
        ? isJobPaused(jobData.status)
        : false;
      
      function cancelExecution() {
          if (!venue || !jobData.id) return;
          gtmEvent.buttonClick('Cancel Job', jobData.id);
          venue.jobs.cancel(jobData.id)
            .then(() => notifySuccess("Job cancelled"))
            .catch((err) => notifyError("Unable to cancel job", err))
      }
      function deleteExecution() {
          if (!venue || !jobData.id) return;
          gtmEvent.buttonClick('Delete Job', jobData.id);
          venue.jobs.delete(jobData.id).then(() => {
            router.push("/venues/"+venue.venueId+"/jobs");
          }).catch((err) => notifyError("Unable to delete job", err))
      }
      function pauseExecution() {
          if (!venue || !jobData.id) return;
          gtmEvent.buttonClick('Pause Job', jobData.id);
          venue.jobs.pause(jobData.id).then(() => {
            notifySuccess("Job paused");
          }).catch((err) => {
            notifyError("Unable to pause job", err);
          });
      }
      function resumeExecution() {
          if (!venue || !jobData.id) return;
          gtmEvent.buttonClick('Resume Job', jobData.id);
          venue.jobs.resume(jobData.id).then(() => {
            notifySuccess("Job resumed");
          }).catch((err) => {
            notifyError("Unable to resume job", err);
          });
      }

  return (
     <div className="flex flex-row flex-wrap items-center justify-end gap-2 shrink-0">
     {!isFinished && 
            <>
            {/* One real <button> per action (the shadcn Button) — both triggers
                chain onto it via asChild. Nesting trigger buttons is invalid
                HTML and breaks hydration. */}
            <AlertDialog>
                  <Tooltip>
                  <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                              <Button
                              aria-label="cancel" role="button"
                              variant={"outline"} className="text-xs justify-center h-8text-sm">
                                <StopCircle/>Cancel</Button>
                          </AlertDialogTrigger>
                    </TooltipTrigger>
                  <TooltipContent>Cancel job</TooltipContent>
                  </Tooltip>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to cancel the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(_e) => cancelExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
            </AlertDialog>
      
           {!isPaused && <AlertDialog>
                  <Tooltip>
                  <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                              <Button  aria-label="pause" role="button"
                              variant={"outline"} className="text-xs justify-center h-8 text-sm">
                              <PauseCircleIcon/>Pause </Button>
                          </AlertDialogTrigger>
                    </TooltipTrigger>
                  <TooltipContent>Pause job</TooltipContent>
                  </Tooltip>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to pause the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(_e) => pauseExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
           </AlertDialog>
           }
           {isPaused && <AlertDialog>
                  <Tooltip>
                  <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                               <Button  aria-label="resume" role="button"
                               variant={"outline"} className="text-xs justify-center h-8 bg-primary text-sm">
                                <PauseCircleIcon />Resume</Button>
                          </AlertDialogTrigger>
                    </TooltipTrigger>
                  <TooltipContent>Resume job</TooltipContent>
                  </Tooltip>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to resume the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(_e) => resumeExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
           </AlertDialog>
           }
            </>
    }
    {isFinished && 
          <><AlertDialog>
                  <Tooltip>
                  <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                               <Button  aria-label="delete" role="button"
                               variant={"outline"} className="text-xs justify-center h-8 text-sm">
                                <Trash2/>Delete
                                </Button>

                          </AlertDialogTrigger>
                    </TooltipTrigger>
                  <TooltipContent>Delete job</TooltipContent>
                  </Tooltip>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to delete the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(_e) => deleteExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
          </AlertDialog>

          </>
    }
          
    </div>
  );
};
