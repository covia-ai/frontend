
'use client'

import { useEffect, useState } from "react";
import { Asset, JobMetadata, RunStatus, Venue } from "@/lib/covia";
import { Check, CircleX, Clock, Copy, FileInput, FileOutput, Hash, RotateCcw, Settings, Timer, Trash2, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import {  getExecutionTime } from "@/lib/utils";
import { TbSubtask } from "react-icons/tb";
import Link from "next/link";

import { isJobFinished } from "@/lib/covia/Utils";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { ExecutionHeader } from "./ExecutionHeader";
import { ExecutionToolbar } from "./ExecutionToolbar";
import { useVenues } from "@/hooks/use-venues";
import { Grid,Job } from "@/lib/covia";
import { CredentialsHTTP } from "@/lib/covia/Credentials";
import { useSession } from "next-auth/react";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


export const ExecutionViewer = (props: any) => {
    const [jobMetadata, setJobMetadata] = useState<JobMetadata>()
    const [poll, setPollStatus] = useState("");
    const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
    const { venues, addVenue } = useVenues();
    const [venue, setVenue] = useState<Venue>();
    const { data: session } = useSession();
    const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());

    const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second:'2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC', // Key setting for UTC time
   });


    useEffect(() => {
    
      if(props.venueId != venueObj?.venueId) {
        const venue = venues.find(v => v.venueId === props.venueId);
        if (venue) {
            setVenue(new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.name}))
         }
         else {
          Grid.connect(decodeURIComponent(props.venueId), 
            new CredentialsHTTP(decodeURIComponent(props.venueId),"",session?.user?.email || "")).then((venue) => {
            addVenue(venue)
            setVenue(venue)
          });
         }
    }
    else {
        setVenue(new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.name}));  
    }  
   }, [addVenue, props.venueId, session?.user?.email, venueObj?.baseUrl, venueObj?.name, venueObj?.venueId, venues]); 

    // Function to determine text color based on status
    function colourForStatus(status: RunStatus): string {
        switch (status) {
            case RunStatus.COMPLETE:
                return "text-green-600";
            case RunStatus.CANCELLED:
            case RunStatus.REJECTED:
            case RunStatus.INPUT_REQUIRED:
            case RunStatus.AUTH_REQUIRED:
            case RunStatus.TIMEOUT:
            case RunStatus.FAILED:
                return "text-red-600";
            case RunStatus.PENDING:
            case RunStatus.PAUSED:
            case RunStatus.STARTED:
                return "text-blue-600";
            default:
                return "text-gray-600";
        }
    }

    function fetchJobStatus() {
        venue?.getJob(props.jobId).then((job:Job) => {
                setJobMetadata(job.metadata);
                setPollStatus(job.metadata.status || "");
        }).catch((error) => {
                setPollStatus("ERROR");
        })
    }

    useEffect(() => {
        if (!venue) return;
        fetchJobStatus();
    }, [venue, props.jobId]);

    useEffect(() => {
        if (!isJobFinished(jobMetadata?.status)) {
            const intervalId = setInterval(() => {
                fetchJobStatus();
            }, 1000)

            return () => clearInterval(intervalId)
        }
    }, [poll])

    function renderChildJobs(jsonObject: JSON) {
        const steps = jobMetadata?.steps as any[];
        return (
            <Table className="border border-slate-200 rounded-md py-2 ">
                <TableHeader className="">
                    <TableRow className="bg-secondary-light">
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
                                    <TableCell className="text-secondary-light dark:text-card-foreground">{index}</TableCell>
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
            let schema: any = {};
            if (type == "input") {
                keys = Object.keys(jobMetadata?.input || {});
                schema = assetsMetadata?.metadata?.operation?.input;
                inOutType = schema?.type ;
            } else {
                schema = assetsMetadata?.metadata?.operation?.output;
                inOutType = schema?.type;
                keys = Object.keys(jobMetadata?.output || {});
            }
            
            // render function for each key within the input or output like "prompt" or "image"
            const renderContent = (key: string) => {
                const fieldType = schema?.properties?.[key]?.type || "object";
                const isSecret = schema?.properties?.[key]?.secret === true;
                const value = (jsonObject as any)[key];

                // Mask secret outputs
                if (isSecret) {
                    return <TableCell className="max-w-xs break-words whitespace-pre-wrap italic text-card-foreground">Secret Hidden</TableCell>;
                }

                if (fieldType === "string") {
                    // Display string values as plain text with proper line breaks
                    return <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">{value}</TableCell>;
                } else {
                    // For non-string types, use JSON.stringify
                    const text = JSON.stringify(value);
                    return <TableCell className="max-w-xs break-words whitespace-normal text-card-foreground">{text}</TableCell>;
                }
            }

            // render function for the type each key within the input or output like "string" or "asset"
            const renderType = (key: string) => {
                const fieldType = schema?.properties?.[key]?.type;
                if(fieldType == undefined) {
                    return (
                    <TableCell className="text-card-foreground flex flex-row space-x-1">
                        
                        <span>{typeof key}</span>
                        <Tooltip>
                            <TooltipTrigger>
                                <QuestionMarkCircledIcon></QuestionMarkCircledIcon>
                            </TooltipTrigger>
                            <TooltipContent>
                                The type is not specified in the schema or the data was interpretted as {typeof key}
                            </TooltipContent>
                        </Tooltip>
                        </TableCell>
                    )
                }

                return <TableCell className="text-card-foreground">{fieldType}</TableCell>;
            }

            if (keys == undefined || keys == null) {
                return <div>No Data</div>
            } else if (keys.length > 0) {
                return (
                    <Table className="border border-slate-200 rounded-md py-2">
                        <TableHeader>
                            <TableRow className="bg-secondary-light">
                                <TableCell >Name</TableCell>
                                <TableCell >Value</TableCell>
                                <TableCell>Type</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody >
                            {keys.map((key, index) => (
                                <TableRow key={index}>
                                    {type == "input" 
                                        ? <TableCell key={index} className="text-md bg-input-color text-io-foreground">{key}</TableCell>
                                        : <TableCell key={index} className="text-md bg-output-color text-io-foreground">{key}</TableCell>}
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
             <SmartBreadcrumb assetOrJobName={jobMetadata?.name} venueName={venue?.name} />
           
             <ExecutionHeader  jobData={jobMetadata}></ExecutionHeader>
            {jobMetadata && (

                <div className="flex flex-col w-full items-center justify-center">
                  
                    <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-full  p-4 items-center justify-between">
                        <div className="flex flex-col w-full">
                             
                           <div className="flex flex-row items-start w-full">
                                <div className="flex flex-row items-center space-x-4 py-2 w-1/2">
                                    {jobMetadata?.status == RunStatus.COMPLETE && <Check></Check>}
                                    {jobMetadata?.status == RunStatus.FAILED && <X></X>}
                                    {jobMetadata?.status == RunStatus.PENDING && <RotateCcw />}
                                    {jobMetadata?.status == RunStatus.STARTED && < RotateCcw />}

                                    <span className="w-28">Status:</span>
                                    <span className={colourForStatus(jobMetadata?.status as RunStatus)}>{jobMetadata?.status}</span>
                                </div>
                                 <ExecutionToolbar jobData={jobMetadata}></ExecutionToolbar>

                            </div>
                             
                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Clock></Clock>
                                <span className="w-28">Created Date</span>
                                <span className="text-card-foreground">{jobMetadata?.created ? formatter.format(new Date(jobMetadata.created)).replace(', ', 'T') + 'Z' : 'N/A'}</span>
                            </div>
                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Clock></Clock>
                                <span className="w-28">Updated Date:</span>
                                <span className="text-card-foreground">{jobMetadata?.updated ? formatter.format(new Date(jobMetadata.updated)).replace(', ', 'T') + 'Z' : 'N/A'}</span>
                            </div>
                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Timer></Timer>
                                <span className="w-28">Time:</span>
                                <span className="text-card-foreground">{jobMetadata?.created && jobMetadata?.updated ? getExecutionTime(jobMetadata.created, jobMetadata.updated) : 'N/A'}</span>
                            </div>
                            <div className="flex flex-col py-2 space-x-4 w-3/4 ">{jobMetadata?.steps &&
                                <div className="flex flex-row space-x-4  py-2">
                                    <div className="flex flex-row space-x-4 my-2 ">
                                        <TbSubtask size={20}></TbSubtask>
                                        <span className="w-28">Steps:</span>
                                    </div>
                                    {renderChildJobs(jobMetadata?.steps)}
                                </div>
                            }
                            </div>
                            <div className="flex flex-row w-full items-start justify-between space-x-4 ">
                                <div className="flex flex-col py-2 space-x-4 w-1/2 ">
                                    <div className="flex flex-row space-x-4 my-2 ">
                                        <FileInput></FileInput>
                                        <span className="w-28">Input:</span>
                                    </div>
                                    {renderJSONObject(jobMetadata?.input, "input",)}
                                </div>
                                {jobMetadata?.status != RunStatus.FAILED &&
                                    <div className="flex flex-col  py-2 space-x-4 w-1/2">
                                        <div className="flex flex-row space-x-4 my-2 ">
                                            <FileOutput></FileOutput>
                                            <span className="w-28">Output:</span>
                                        </div>
                                        {renderJSONObject(jobMetadata?.output, "output")}
                                        {jobMetadata?.status == RunStatus.FAILED && <div>{jobMetadata?.error}</div>}
                                    </div>
                                }
                                {jobMetadata?.status == RunStatus.FAILED &&
                                    <div className="flex flex-row  py-2 space-x-4 w-1/2 my-2">
                                        <div className="flex flex-row space-x-4 ">
                                            <FileOutput></FileOutput>
                                            <span className="w-28">Error:</span>
                                        </div>
                                        <div className="text-card-foreground">{jobMetadata?.error}</div>
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

