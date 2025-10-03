'use client'

import {  JobData, RunStatus, Venue } from "@/lib/covia";

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
import { ResumeIcon } from "@radix-ui/react-icons";
import { isJobFinished, isJobPaused } from "@/lib/covia/Utils";

export const ExecutionToolbar = ({jobData} : JobData) => {

     const router = useRouter()

     const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
      if (!venueObj) return null;
      const venue = useMemo(() => {
        // Your expensive calculation or value creation
        return new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})
        }, []); // Dependency array
  
      const [isFinished, setFinished] = useState<boolean>(false);
      const [isPaused, setPaused] = useState<boolean>(false);

       useEffect(() => {
         if(jobData?.status != null)
            setFinished(isJobFinished(jobData))
            setPaused(isJobPaused(jobData));
       },[jobData])
      
      function cancelExecution() {
          if (!venue) return;
          venue.cancelJob(jobData.id).then((response) => {
             console.log(response)
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
     <div className="flex flex-row  items-center justify-center border border-slate-200 shadow-md w-full mt-4 p-2 text-xs space-x-4">          
     {!isFinished && 
            <>
            <Tooltip>
                  <TooltipTrigger>
                        <AlertDialog>
                          <AlertDialogTrigger className="flex flex-row hover:text-red-400">
                              Cancel<StopCircle className="text-secondary mx-2 hover:text-red-400" size={20} ></StopCircle>
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
                          <AlertDialogTrigger  className="flex flex-row  hover:text-red-400">
                              Pause <PauseCircleIcon size={20} className="text-secondary mx-2 hover:text-red-400"></PauseCircleIcon>
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
                              Resume <PauseCircleIcon size={20} className="text-secondary mx-2 hover:text-red-400"></PauseCircleIcon>
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
                              Delete<Trash2 size={20} className="text-secondary mx-2"></Trash2>
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