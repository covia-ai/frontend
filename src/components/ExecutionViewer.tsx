
'use client'

import { useEffect, useMemo, useState } from "react";
import { Asset, RunStatus, Venue } from "@/lib/covia";
import { JobData } from "@/lib/covia/types";
import { Check, CircleX, Clock, Copy, FileInput, FileOutput, Hash, RotateCcw, Timer, Trash2, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useRouter } from "next/navigation";
import { copyDataToClipBoard, getExecutionTime } from "@/lib/utils";
import { TbSubtask } from "react-icons/tb";
import Link from "next/link";
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
import { isJobFinished } from "@/lib/covia/Utils";


export const ExecutionViewer = (props: any) => {
    const router = useRouter()
    const [executionData, setExecutionData] = useState<JobData>({})
    const [poll, setPollStatus] = useState("");
    const [assetsMetadata, setAssetsMetadata] = useState<Asset>();

    const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
    if (!venueObj) return null;
    const venue = useMemo(() => {
      // Your expensive calculation or value creation
      return new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})
      }, []); // Dependency array

    // Function to determine text color based on status
    function colourForStatus(status: RunStatus): string {
        switch (status) {
            case RunStatus.COMPLETE:
                return "text-green-600";
            case RunStatus.FAILED:
                return "text-red-600";
            case RunStatus.PENDING:
            case RunStatus.STARTED:
                return "text-blue-600";
            default:
                return "text-gray-600";
        }
    }

    function fetchJobStatus() {
        if (!venue) return;
        venue.getJob(props.jobId).then((response) => {
                
                setExecutionData(response);
                setPollStatus(response.status || "");
        }).catch((error) => {
                setPollStatus("ERROR");
        })
    }
    
    function cancelExecution() {
        if (!venue) return;
        venue.cancelJob(props.jobId).then((response) => {
           console.log(response)
        })
    }
   
     function deleteExecution() {
        if (!venue) return;
        venue.deleteJob(props.jobId).then((response) => {
          if(response == 200) {
            router.push("/venues/"+venue.venueId+"/jobs");
          }
        })
    }

    useEffect(() => {
        if (!venue) return;
        venue.getJob(props.jobId).then((response) => {
            setExecutionData(response);
            setPollStatus(response.status || "");
            venue.getAsset(response?.op).then((asset: Asset) => {
                setAssetsMetadata(asset);
            })
        })
    }, [venue, props.jobId]);

    useEffect(() => {
        if (executionData?.status != null && !isJobFinished(executionData)) {
            const intervalId = setInterval(() => {
                fetchJobStatus();
            }, 1000)

            return () => clearInterval(intervalId)
        }
    }, [poll])

    function renderChildJobs(jsonObject: JSON) {
        const steps = executionData.steps as any[];
        return (
            <Table className="border border-slate-200 rounded-md py-2 ">
                <TableHeader>
                    <TableRow className="bg-slate-200">
                        <TableCell>#</TableCell>
                        <TableCell>Job Id</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody >
                    { /* Loop through the steps and render a table row for each step */
                        steps?.map((step: any, index: number) => {
                            const status = step?.status || "UNKNOWN";
                            const id = step?.id || "";
                            return (
                                <TableRow key={index} >
                                    <TableCell className="text-secondary">{index}</TableCell>
                                    <TableCell className="text-secondary font-mono underline"><Link href={`/jobs/${id}`}>{id}</Link></TableCell>
                                    <TableCell>
                                        <span className={colourForStatus(status)}>{status}</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                </TableBody>
            </Table>
        )
    }
    function renderJSONObject(jsonObject: any, type: string) {
        if (jsonObject != undefined) {
            let keys = []; // keys of the input or output
            let inOutType = ""; // type of the input or output e.g. string, number, object, array
            let assetLink = "";
            let schema: any = {};
            if (type == "input") {
                keys = Object.keys(executionData?.input || {});
                schema = assetsMetadata?.metadata?.operation?.input;
                inOutType = schema?.type;
            } else {
                schema = assetsMetadata?.metadata?.operation?.output;
                inOutType = schema?.type;
                keys = Object.keys(executionData?.output || {});
            }
            if (inOutType == "asset")
                assetLink = window.location.href + "/venues/"+venue.venueId+"/assets/" + assetsMetadata?.id;

            // render function for each key within the input or output like "prompt" or "image"
            const renderContent = (key: string) => {
                const fieldType = schema?.properties?.[key]?.type || "object";
                const isSecret = schema?.properties?.[key]?.secret === true;
                const value = (jsonObject as any)[key];

                // Mask secret outputs
                if (isSecret) {
                    return <TableCell className="max-w-xs break-words whitespace-pre-wrap italic">Secret Hidden</TableCell>;
                }

                if (fieldType === "string") {
                    // Display string values as plain text with proper line breaks
                    return <TableCell className="max-w-xs break-words whitespace-pre-wrap">{value}</TableCell>;
                } else {
                    // For non-string types, use JSON.stringify
                    const text = JSON.stringify(value);
                    return <TableCell className="max-w-xs break-words whitespace-normal">{text}</TableCell>;
                }
            }

            // render function for the type each key within the input or output like "string" or "asset"
            const renderType = (key: string) => {
                const fieldType = schema?.properties?.[key]?.type || "object";
                return <TableCell className="text-slate-600">{fieldType}</TableCell>;
            }

            if (keys == undefined || keys == null) {
                return <div>No Data</div>
            } else if (keys.length > 0) {
                return (
                    <Table className="border border-slate-200 rounded-md py-2">
                        <TableHeader>
                            <TableRow className="bg-slate-200">
                                <TableCell >Name</TableCell>
                                <TableCell >Value</TableCell>
                                <TableCell>Type</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody >
                            {keys.map((key, index) => (
                                <TableRow key={index}>
                                    {type == "input" 
                                        ? <TableCell key={index} className="font-semibold bg-yellow-100">{key}</TableCell>
                                        : <TableCell key={index} className="font-semibold bg-blue-100">{key}</TableCell>}
                                    {renderContent(key)}
                                    {renderType(key)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                )
            } else {
                /* If there are no keys, render a table with the value and type */
                return (<Table className="border border-slate-200 rounded-md py-2">
                    <TableHeader>
                        <TableRow className="bg-slate-200">
                            <TableCell >Value</TableCell>
                            <TableCell>Type</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody >
                        <TableRow>
                            <TableCell><div className="font-mono">{JSON.stringify(jsonObject)}</div></TableCell>
                            <TableCell>{typeof jsonObject}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                )
            }
        }
    }

    return (
        <>
            {executionData && (

                <div className="flex flex-col w-full items-center justify-center">
                    <div className="flex flex-row-reverse space-x-2 space-x-reverse w-full">
                        <div className="flex flex-row text-xs ">
                            <span> {(window.location.href).slice(0, 60) + "..."} </span>
                            <span><Copy size={12} onClick={(e) => copyDataToClipBoard(window.location.href, "Job Link copied to clipboard")}></Copy></span>

                        </div>
                        <div className="flex flex-row ">
                            <span className="text-xs">{props.jobId.slice(0, 60) + "..."} </span>
                            <span><Copy size={12} onClick={(e) => copyDataToClipBoard(props.jobId, "Job Id copied to clipboard")}></Copy></span>
                        </div>
                    </div>
                    <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-11/12 mt-8 p-4 items-center justify-between">
                        <div className="flex flex-col w-full">
                             {poll && (poll == RunStatus.STARTED  || poll == RunStatus.PENDING) && 
                             <div className="flex flex-row-reverse">
                          
                               
                                <Tooltip>
                                        <TooltipTrigger>
                                             <AlertDialog>
                                                <AlertDialogTrigger>
                                                    <CircleX size={20} className="text-secondary mx-2"></CircleX>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>

                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure you want to cancel the operation?</AlertDialogTitle>
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
                                        <TooltipContent>Cancel operation</TooltipContent>
                                        
                                 </Tooltip> 
                            
                                  <Tooltip>
                                        <TooltipTrigger>
                                             <AlertDialog>
                                                <AlertDialogTrigger>
                                                    <Trash2 size={20} className="text-secondary mx-2"></Trash2>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>

                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure you want to delete the operation?</AlertDialogTitle>
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
                                        <TooltipContent>Delete operation</TooltipContent>
                                        
                                 </Tooltip> 
                           </div>
                           }
                            <div className="flex flex-row items-center space-x-4 py-2">
                                {executionData?.status == RunStatus.COMPLETE && <Check></Check>}
                                {executionData?.status == RunStatus.FAILED && <X></X>}
                                {executionData?.status == RunStatus.PENDING && <RotateCcw />}
                                {executionData?.status == RunStatus.STARTED && < RotateCcw />}

                                <span className="w-28"><strong>Status:</strong></span>
                                <span className={colourForStatus(executionData?.status as RunStatus)}>{executionData?.status}</span>
                            </div>

                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Clock></Clock>
                                <span className="w-28"><strong>Created Date:</strong></span>
                                <span>{executionData?.created ? new Date(executionData.created).toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Clock></Clock>
                                <span className="w-28"><strong>Updated Date:</strong></span>
                                <span>{executionData?.updated ? new Date(executionData.updated).toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Timer></Timer>
                                <span className="w-28"><strong>Time:</strong></span>
                                <span>{executionData?.created && executionData?.updated ? getExecutionTime(executionData.created, executionData.updated) : 'N/A'}</span>
                            </div>
                            <div className="flex flex-col py-2 space-x-4 w-3/4 ">{executionData?.steps &&
                                <div className="flex flex-row space-x-4  py-2">
                                    <div className="flex flex-row space-x-4 my-2 ">
                                        <TbSubtask size={20}></TbSubtask>
                                        <span className="w-28"><strong>Steps:</strong></span>
                                    </div>
                                    {renderChildJobs(executionData?.steps)}
                                </div>
                            }
                            </div>
                            <div className="flex flex-row w-full items-start justify-between space-x-4 ">
                                <div className="flex flex-col py-2 space-x-4 w-1/2 ">
                                    <div className="flex flex-row space-x-4 my-2 ">
                                        <FileInput></FileInput>
                                        <span className="w-28"><strong>Input:</strong></span>
                                    </div>
                                    {renderJSONObject(executionData?.input, "input",)}
                                </div>
                                {executionData?.status != RunStatus.FAILED &&
                                    <div className="flex flex-col  py-2 space-x-4 w-1/2">
                                        <div className="flex flex-row space-x-4 my-2 ">
                                            <FileOutput></FileOutput>
                                            <span className="w-28"><strong>Output:</strong></span>
                                        </div>
                                        {renderJSONObject(executionData?.output, "output")}
                                        {executionData?.status == RunStatus.FAILED && <div>{executionData?.error}</div>}
                                    </div>
                                }
                                {executionData?.status == RunStatus.FAILED &&
                                    <div className="flex flex-row  py-2 space-x-4 w-1/2 my-2">
                                        <div className="flex flex-row space-x-4 ">
                                            <FileOutput></FileOutput>
                                            <span className="w-28"><strong>Error:</strong></span>
                                        </div>
                                        <div>{executionData?.error}</div>
                                    </div>
                                }
                            </div>
                        </div>

                    </div>

                </div>
            )
            }

        </>

    );
};

