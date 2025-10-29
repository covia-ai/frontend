'use client'

import {  JobMetadata, Venue } from "@/lib/covia";

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
import { CircleX, PauseCircle, PauseCircleIcon, StarIcon, StopCircle, Trash2 } from "lucide-react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isJobFinished, isJobPaused } from "@/lib/covia/Utils";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface ExecutionToolBarProps {
  jobData: JobMetadata;
}
export const ExecutionToolbar = ({ jobData }: ExecutionToolBarProps) => {

     const router = useRouter()
     const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
      if (!venueObj) return null;
      const venue = useMemo(() => {
        // Your expensive calculation or value creation
        return new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, name:venueObj.name})
        }, []); // Dependency array
  
      const [isFinished, setFinished] = useState<boolean>(false);
      const [isPaused, setPaused] = useState<boolean>(false);

       useEffect(() => {
         if(jobData?.status != null) {
            setFinished(isJobFinished(jobData.status))
            setPaused(isJobPaused(jobData.status));
         }
       },[jobData?.status])
      
      function cancelExecution() {
          if (!venue) return;
          console.log(jobData)
          venue.cancelJob(jobData.id).then((response) => {
             if(response != 200) {
                toast("Unable to cancel job right now")
             }
             else {
              toast("Job cancelled")
             }
          })
      }
      function deleteExecution() {
          if (!venue) return;
          venue.deleteJob(jobData.id).then((response) => {
            if(response == 200) {
              router.push("/venues/"+venue.venueId+"/jobs");
            }
          })
      }
      function pauseExecution() {
         
      }
      function resumeExecution() {
          if (!venue) return;
          venue.deleteJob(jobData.id).then((response) => {
            if(response == 200) {
              router.push("/venues/"+venue.venueId+"/jobs");
            }
          })
      }

  return (
     <div className="flex flex-row items-center space-x-4 py-2 w-1/2">     
     {!isFinished && 
            <>
            <Tooltip>
                  <TooltipTrigger>
                        <AlertDialog>
                          <AlertDialogTrigger className="flex flex-row ">
                              <Button variant={"outline"} className="text-xs justify-center h-8text-sm">
                                <StopCircle/>Cancel</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to cancel the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => cancelExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TooltipTrigger>
                  <TooltipContent>Cancel job</TooltipContent>
                  
            </Tooltip> 
      
           {!isPaused && <Tooltip>
                  <TooltipTrigger>
                        <AlertDialog>
                          <AlertDialogTrigger  className="flex flex-row">
                              <Button variant={"outline"} className="text-xs justify-center h-8 text-sm">
                              <PauseCircleIcon/>Pause </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to pause the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => pauseExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
                  </AlertDialog>
                    </TooltipTrigger>
                  <TooltipContent>Pause job</TooltipContent>
                  
           </Tooltip> 
           }
           {isPaused && <Tooltip>
                  <TooltipTrigger>
                        <AlertDialog>
                          <AlertDialogTrigger  className="flex flex-row hover:text-red-400">
                               <Button variant={"outline"} className="text-xs justify-center h-8 bg-primary text-sm">
                                <PauseCircleIcon />Resume</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to resume the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => resumeExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
                  </AlertDialog>
                    </TooltipTrigger>
                  <TooltipContent>Resume job</TooltipContent>
                  
           </Tooltip> 
           }
            </>
    }
    {isFinished && 
          <><Tooltip>
                  <TooltipTrigger>
                        <AlertDialog>
                          <AlertDialogTrigger className="flex flex-row">
                               <Button variant={"outline"} className="text-xs justify-center h-8 text-sm">
                                <Trash2/>Delete
                                </Button>

                          </AlertDialogTrigger>
                          <AlertDialogContent>

                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to delete the job?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. 
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => deleteExecution()}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                          </AlertDialogContent>
                  </AlertDialog>
                    </TooltipTrigger>
                  <TooltipContent>Delete job</TooltipContent>
                  
          </Tooltip> 
      
          </>
    }
          
    </div>
  );
}; 