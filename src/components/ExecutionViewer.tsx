
'use client'

import { useEffect, useState } from "react";
import { Asset, JobMetadata, RunStatus, Venue, isJobFinished,Job,BearerAuth } from "@covia/covia-sdk";
import { Check, CircleX, Clock, Copy, FileInput, FileOutput, Hash, MessageSquare, RotateCcw, Send, Settings, Timer, Trash2, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import {  colourForStatus, formatLabel, getExecutionTime } from "@/lib/utils";
import { TbSubtask } from "react-icons/tb";
import Link from "next/link";
import { ErrorDisplay } from "./ErrorDisplay";
import { ExecutionHeader } from "./ExecutionHeader";
import { ExecutionToolbar } from "./ExecutionToolbar";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TopBar } from "./admin-panel/TopBar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";


export const ExecutionViewer = (props: any) => {
    const [jobMetadata, setJobMetadata] = useState<JobMetadata>()
    const [poll, setPollStatus] = useState("");
    const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
    const { venues, addVenue } = useVenues();
    const [venue, setVenue] = useState<Venue>();
    const authData = useAuthStore((x) => x.auth);
    const [jobMessage, setJobMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());

    const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
   });


    useEffect(() => {
    
      const authOption = authData ? new BearerAuth(authData.token) : undefined;
      if(props.venueId != venueObj?.venueId) {
        const venue = venues.find(v => v.venueId === props.venueId);
        if (venue) {
            setVenue(new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.metadata.name, auth: authOption}))
         }
         else {
          Venue.connect(decodeURIComponent(props.venueId),
            authOption).then((venue) => {
            addVenue(venue)
            setVenue(venue)
          });
         }
    }
    else {
        setVenue(new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name, auth: authOption}));
    }  
   }, [addVenue, props.venueId, authData, venueObj?.baseUrl, venueObj?.metadata.name, venueObj?.venueId, venues]);

    function fetchJobStatus() {
        venue?.jobs.get(props.jobId).then((job:Job) => {
                setJobMetadata(job.metadata);
                setPollStatus(job.metadata.status || "");
        }).catch((error) => {
                setPollStatus("ERROR");
        })
    }

    function handleSendJobMessage() {
        if (!venue || !jobMessage.trim()) return;
        let message: any;
        try {
          message = JSON.parse(jobMessage);
        } catch {
          message = jobMessage;
        }
        setSendingMessage(true);
        venue.jobs.sendMessage(props.jobId, message).then(() => {
          toast("Message sent");
          setJobMessage("");
          fetchJobStatus();
        }).catch(() => {
          toast("Unable to send message");
        }).finally(() => {
          setSendingMessage(false);
        });
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
            <Table className="border border-border rounded-md py-2 ">
                <TableHeader className="">
                    <TableRow className="bg-secondary-light text-secondary-foreground">
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
    if (jsonObject === undefined || jsonObject === null) {
        return <div>No Data</div>
    }
    
    let keys = [];
    let inOutType = "";
    let schema: any = {};
    
    if (type == "input") {
        schema = assetsMetadata?.metadata?.operation?.input;
        inOutType = schema?.type;
        keys = Object.keys(jobMetadata?.input || {});
    } else {
        schema = assetsMetadata?.metadata?.operation?.output;
        inOutType = schema?.type;
        keys = Object.keys(jobMetadata?.output || {});
    }
    
    // Handle primitive values (string, number, boolean) or non-object types
    if (typeof jsonObject !== 'object' || jsonObject === null) {
        return (
            <Table className="border border-border rounded-md py-2">
                <TableHeader>
                    <TableRow className="bg-secondary-light text-secondary-foreground">
                        <TableCell>Value</TableCell>
                        <TableCell>Type</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">
                            {String(jsonObject)}
                        </TableCell>
                        <TableCell className="text-card-foreground">{typeof jsonObject}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        )
    }
    
    // Handle arrays
    if (Array.isArray(jsonObject)) {
        return (
            <Table className="border border-border rounded-md py-2">
                <TableHeader>
                    <TableRow className="bg-secondary-light text-secondary-foreground">
                        <TableCell>Index</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Type</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {jsonObject.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell className="text-card-foreground">{index}</TableCell>
                            <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">
                                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                            </TableCell>
                            <TableCell className="text-card-foreground">{typeof item}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    // render function for each key within the input or output
    const renderContent = (key: string) => {
        const fieldType = schema?.properties?.[key]?.type || "object";
        const isSecret = schema?.properties?.[key]?.secret === true;
        const value = (jsonObject as any)[key];
        
        // Mask secret outputs
        if (isSecret) {
            return <TableCell className="max-w-xs break-words whitespace-pre-wrap italic text-card-foreground">Secret Hidden</TableCell>;
        }

        if (fieldType === "string") {
            return <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">{value}</TableCell>;
        } else {
            const text = JSON.stringify(value);
            return <TableCell className="max-w-xs break-words whitespace-normal text-card-foreground">{text}</TableCell>;
        }
    }

    const renderType = (key: string) => {
        const fieldType = schema?.properties?.[key]?.type;
        if(fieldType == undefined) {
            const actualValue = (jsonObject as any)[key];
            return (
                <TableCell className="text-card-foreground flex flex-row space-x-1">
                    <span>{typeof actualValue}</span>
                    <Tooltip>
                        <TooltipTrigger>
                            <QuestionMarkCircledIcon></QuestionMarkCircledIcon>
                        </TooltipTrigger>
                        <TooltipContent>
                            The type is not specified in the schema or the data was interpreted as {typeof actualValue}
                        </TooltipContent>
                    </Tooltip>
                </TableCell>
            )
        }
        return <TableCell className="text-card-foreground">{fieldType}</TableCell>;
    }

    // Handle empty objects
    if (keys.length === 0) {
        return (
            <Table className="border border-border rounded-md py-2">
                <TableHeader>
                    <TableRow className="bg-secondary-light text-secondary-foreground">
                        <TableCell>Value</TableCell>
                        <TableCell>Type</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell><div className="font-mono">{JSON.stringify(jsonObject)}</div></TableCell>
                        <TableCell>{typeof jsonObject}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        )
    }
    
    // Handle objects with keys (normal case)
    return (
        <Table className="border border-border rounded-md py-2">
            <TableHeader>
                <TableRow className="bg-secondary-light text-secondary-foreground">
                    <TableCell>Name</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Type</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {keys.map((key, index) => (
                    <TableRow key={index}>
                        {type == "input" 
                            ? <TableCell key={index} className="text-md bg-input-color text-io-foreground">{formatLabel(key)}</TableCell>
                            : <TableCell key={index} className="text-md bg-output-color text-io-foreground">{formatLabel(key)}</TableCell>}
                        {renderContent(key)}
                        {renderType(key)}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

    return (
        <>
             <TopBar assetOrJobName={jobMetadata?.name} venueName={venue?.metadata.name} />
           
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

                            {/* INPUT_REQUIRED message form */}
                            {jobMetadata?.status === RunStatus.INPUT_REQUIRED && (
                              <div className="flex flex-col gap-3 py-3 px-4 my-2 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                  <MessageSquare size={18} />
                                  <span className="font-semibold text-sm">This job requires input to continue</span>
                                </div>
                                <Textarea
                                  placeholder="Enter your response (text or JSON)..."
                                  value={jobMessage}
                                  onChange={(e) => setJobMessage(e.target.value)}
                                  className="font-mono text-sm bg-background"
                                  rows={3}
                                />
                                <div className="flex flex-row-reverse">
                                  <Button
                                    size="sm"
                                    onClick={handleSendJobMessage}
                                    disabled={sendingMessage || !jobMessage.trim()}
                                  >
                                    <Send size={14} className="mr-1" />
                                    {sendingMessage ? "Sending..." : "Send Response"}
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Clock></Clock>
                                <span className="w-28">Created Date</span>
                                <span className="text-card-foreground">{jobMetadata?.created ? formatter.format(new Date(jobMetadata.created)) : 'N/A'}</span>
                            </div>
                            <div className="flex flex-row items-center space-x-4  py-2">
                                <Clock></Clock>
                                <span className="w-28">Updated Date:</span>
                                <span className="text-card-foreground">{jobMetadata?.updated ? formatter.format(new Date(jobMetadata.updated)) : 'N/A'}</span>
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
                                        {jobMetadata?.status == RunStatus.FAILED && jobMetadata?.error && <ErrorDisplay error={jobMetadata.error} />}
                                    </div>
                                }
                                {jobMetadata?.status == RunStatus.FAILED && jobMetadata?.error &&
                                    <div className="flex flex-row  py-2 space-x-4 w-1/2 my-2">
                                        <div className="flex flex-row space-x-4 ">
                                            <FileOutput></FileOutput>
                                            <span className="w-28">Error:</span>
                                        </div>
                                        <ErrorDisplay error={jobMetadata.error} />
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

