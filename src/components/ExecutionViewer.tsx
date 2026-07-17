
'use client'

import { useEffect, useState } from "react";
import { Asset, JobMetadata, RunStatus, isJobFinished,Job } from "@covia/covia-sdk";
import { Check, Clock, Copy, FileInput, FileOutput, Hash, MessageSquare, RotateCcw, Send, Timer, X }from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { useResolvedVenue } from "@/hooks/use-resolved-venue";
import {  copyDataToClipBoard, formatLabel, getExecutionTime, looksLikeSecretField } from "@/lib/utils";
import { TbSubtask } from "react-icons/tb";
import Link from "next/link";
import { ErrorDisplay } from "./ErrorDisplay";
import { StatusBadge } from "./StatusBadge";
import { ExecutionHeader } from "./ExecutionHeader";
import { ExecutionToolbar } from "./ExecutionToolbar";
import { useAuthStore } from "@/hooks/use-auth";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TopBar } from "./admin-panel/TopBar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";


export const ExecutionViewer = (props: any) => {
    const [jobMetadata, setJobMetadata] = useState<JobMetadata>()
    const [assetsMetadata, setAssetsMetadata] = useState<Asset>();
    const venue = useResolvedVenue(props.venueId);
    const [streaming, setStreaming] = useState(false);
    const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
    const [jobMessage, setJobMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);

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
        if (!venue || !jobMetadata?.operation) return;
        venue.getAsset(jobMetadata.operation).then(setAssetsMetadata).catch(() => {});
    }, [venue, jobMetadata?.operation]);

    function fetchJobStatus() {
        venue?.jobs.get(props.jobId).then((job:Job) => {
                setJobMetadata(job.metadata);
        }).catch(() => {})
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
        if (!venue || !props.jobId) return;

        // Initial load so the UI isn't blank while SSE connects.
        fetchJobStatus();

        const authData = getAuthForVenue(venue.venueId ?? '');
        const sseUrl = `${venue.baseUrl}/api/v1/jobs/${props.jobId}/sse`;

        let source: EventSource | null = null;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (pollInterval) return;
            setStreaming(false);
            fetchJobStatus();
            pollInterval = setInterval(() => {
                venue.jobs.get(props.jobId).then((job: Job) => {
                    setJobMetadata(job.metadata);
                    const status = job.metadata.status || '';
                    if (isJobFinished(status as RunStatus) && pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                    }
                }).catch(() => {});
            }, 1000);
        };

        // Native EventSource cannot attach the bearer header or Ed25519
        // signature used by authenticated venue requests. Poll through the
        // authenticated SDK instead of leaking bearer credentials in a URL.
        if (authData) {
            startPolling();
            return () => {
                if (pollInterval) clearInterval(pollInterval);
            };
        }

        try {
            source = new EventSource(sseUrl);

            source.onopen = () => { setStreaming(true); };

            source.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const meta = data.metadata ?? data;
                    setJobMetadata(meta);
                    const status: string = meta.status ?? '';
                    if (isJobFinished(status as RunStatus)) {
                        source?.close();
                        source = null;
                        setStreaming(false);
                    }
                } catch { /* ignore malformed event */ }
            };

            source.onerror = () => {
                source?.close();
                source = null;
                setStreaming(false);
                // A stream can fail after opening as well as during setup. Once
                // closed, polling must take over or a running job stays stale.
                startPolling();
            };
        } catch {
            startPolling();
        }

        return () => {
            source?.close();
            setStreaming(false);
            if (pollInterval) clearInterval(pollInterval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venue, props.jobId]);

    function renderChildJobs() {
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
                                <TableRow key={id || index} >
                                    <TableCell className="text-muted-foreground">{index}</TableCell>
                                    <TableCell className="text-secondary font-mono underline"><Link href={`/venues/${encodeURIComponent(venue?.venueId ?? props.venueId ?? "")}/jobs/${id}`}>{id}</Link></TableCell>
                                    <TableCell>
                                        <StatusBadge status={status} kind="job" />
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
let schema: any = {};
    
    if (type == "input") {
        schema = assetsMetadata?.metadata?.operation?.input;
        keys = Object.keys(jobMetadata?.input || {});
    } else {
        schema = assetsMetadata?.metadata?.operation?.output;
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
        const isSecret = schema?.properties?.[key]?.secret === true || looksLikeSecretField(key);
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
                {keys.map((key) => (
                    <TableRow key={key}>
                        {type == "input" 
                            ? <TableCell className="text-md bg-input-color text-io-foreground">{formatLabel(key)}</TableCell>
                            : <TableCell className="text-md bg-output-color text-io-foreground">{formatLabel(key)}</TableCell>}
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
           
             <ExecutionHeader  jobData={jobMetadata} venueId={venue?.venueId ?? props.venueId}></ExecutionHeader>
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
                                    <StatusBadge status={jobMetadata?.status} kind="job" />

                                    {streaming && (
                                        <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            Streaming
                                        </span>
                                    )}
                                    {!streaming && jobMetadata?.status && isJobFinished(jobMetadata.status) && (
                                        <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                            Completed
                                        </span>
                                    )}
                                </div>
                                 <ExecutionToolbar jobData={jobMetadata} venue={venue}></ExecutionToolbar>

                            </div>

                            <div className="flex flex-row items-center space-x-4 py-2">
                                <Hash></Hash>
                                <span className="w-28">Job ID:</span>
                                <span className="text-card-foreground font-mono break-all">{props.jobId}</span>
                                <button
                                    type="button"
                                    aria-label="copy job id"
                                    onClick={() => copyDataToClipBoard(props.jobId, "Job ID copied")}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <Copy size={14} />
                                </button>
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
                            <div className="flex flex-col py-2 space-x-4 w-3/4 ">{jobMetadata?.steps != null &&
                                <div className="flex flex-row space-x-4  py-2">
                                    <div className="flex flex-row space-x-4 my-2 ">
                                        <TbSubtask size={20}></TbSubtask>
                                        <span className="w-28">Steps:</span>
                                    </div>
                                    {renderChildJobs()}
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

