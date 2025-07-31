
'use client'
/* eslint-disable */

import { useEffect, useState } from "react";
import { Asset, RunStatus, Venue } from "@/lib/covia/covialib";
import { Check, Clock,  Copy,  CopyCheck,  FileInput, FileOutput, Hash, RotateCcw, Timer, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useRouter } from "next/navigation";
import { copyDataToClipBoard, getExecutionTime } from "@/lib/utils";
import { TbSubtask } from "react-icons/tb";
import Link from "next/link";

export const ExecutionViewer = (props:any) => {
        const router = useRouter()
        const [executionData, setExecutionData] = useState({})
        const [poll, setPollStatus] = useState("");
        const [assetsMetadata, setAssetsMetadata] = useState<Asset>();

        const venue = useStore(useVenue, (x) => x).venue;
        if (!venue) return null;
            
        function fetchJobStatus() {
            venue.getJob(props.jobId).then(( response) => {
                 
                  console.log(response)
                  setExecutionData(response);
                  setPollStatus(response.status);
            
             })
        }
        useEffect(() => {
              venue.getJob(props.jobId).then(( response) => {
                 
                  setExecutionData(response);
                  setPollStatus(response.status);
                   venue.getAsset(response?.op).then(( asset:Asset) => {
                        setAssetsMetadata(asset);
                  
                })
             })
      }, []);
    
      useEffect(() => {
        if(poll == RunStatus.PENDING) {
            const intervalId = setInterval(() => {
            fetchJobStatus();
        }, 1000)
        
        return () => clearInterval(intervalId)
       }
    }, [poll])

      function renderChildJobs(jsonObject: JSON) {
         let steps = executionData.steps;
         console.log(steps)
         return (

                        <Table className="border border-slate-200 rounded-md py-2">
                            <TableHeader>
                                <TableRow className="bg-slate-200">
                                   
                                    <TableCell className="text-center">JobId</TableCell>
                                    <TableCell className="text-center ">Status</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody >
                                  {steps.map((step,index) => (
                                    <TableRow key={index}>
                                    <TableCell className="text-pink-600 underline"><Link href={`/runs/${step.id}`}>{step.id}</Link></TableCell>
                                     {step?.status == RunStatus.COMPLETE && <span className="text-green-600 ">{RunStatus.COMPLETE}</span>}
                                     {step?.status == RunStatus.FAILED && <span className="text-red-600 ">{RunStatus.FAILED}</span>}
                                     {step?.status == RunStatus.PENDING && <span className="text-blue-600 ">{RunStatus.PENDING}</span>}
                                     {step?.status == RunStatus.STARTED && <span className="text-blue-600 ">{RunStatus.STARTED}</span>}
                                  </TableRow>
                                  ))}
                            </TableBody>
                        </Table>
                
                    )
      }
      function renderJSONObject(jsonObject: JSON, type:string) {
            if(jsonObject != undefined) {      
                let keys = new Array();
                let inOutType = "", assetLink ="";
                if(type == "input") {
                    keys = Object.keys(executionData?.input);
                    inOutType = assetsMetadata?.metadata?.operation?.input?.type;
                }
                else {
                     keys = Object.keys(executionData?.output);
                     inOutType = assetsMetadata?.metadata?.operation?.output?.type;
                }
                if(inOutType == "asset")
                      assetLink = window.location.href+"/venues/default/assets/"+assetsMetadata?.id;
                if(keys != undefined && keys.length > 0) {
                    return (
                        <Table className="border border-slate-200 rounded-md py-2">
                            <TableHeader>
                                <TableRow className="bg-slate-200">
                                   
                                    <TableCell className="text-center">Name</TableCell>
                                    <TableCell className="text-center flex-2">Value</TableCell>
                                    {inOutType && <TableCell className="text-center ">Type</TableCell>}
                                </TableRow>
                            </TableHeader>
                            <TableBody >
                                {keys.map((key,index) => (
                                <TableRow key={index}>
                                  
                                    <TableCell key={index} className="text-left font-bold bg-pink-100">{key}</TableCell>
                                    {inOutType != "asset" && <TableCell className="text-center flex-2">{JSON.stringify(jsonObject[key])}</TableCell>}
                                    {inOutType == "asset" && <TableCell className="text-center flex-2">{assetLink}</TableCell>}
                                    {inOutType && <TableCell className="text-center text-slate-600">{inOutType}</TableCell>}
                                </TableRow>
                                ))}
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
                  <div className="flex flex-row-reverse space-x-4 space-x-reverse w-full"> 
                       <div className="flex flex-row text-xs ">
                        <span> {(window.location.href).slice(0,60)+"..."} </span>
                        <span><Copy size={12} onClick={ (e) => copyDataToClipBoard(window.location.href, "Job Link copied to clipboard")}></Copy></span>
                     
                      </div>
                       <div className="flex flex-row ">
                        <span className="text-xs">{props.jobId.slice(0,60)+"..."} </span>
                        <span><Copy size={12} onClick={ (e) => copyDataToClipBoard(props.jobId, "Job Id copied to clipboard")}></Copy></span>
                      </div>
                    </div>   
                <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-11/12 mt-8 p-4 items-center justify-between">
                  <div className="flex flex-col w-full">
                     
                     <div className="flex flex-row items-center space-x-4 py-2">
                                    {executionData?.status == RunStatus.COMPLETE && <Check></Check>}
                                    {executionData?.status == RunStatus.FAILED &&   <X></X>}
                                    {executionData?.status == RunStatus.PENDING &&  <RotateCcw />}
                                    {executionData?.status == RunStatus.STARTED &&  < RotateCcw/>}

                                    <span className="w-28"><strong>Status:</strong></span>
                                    {executionData?.status == RunStatus.COMPLETE && <span className="text-green-600 ">{RunStatus.COMPLETE}</span>}
                                    {executionData?.status == RunStatus.FAILED && <span className="text-red-600 ">{RunStatus.FAILED}</span>}
                                    {executionData?.status == RunStatus.PENDING && <span className="text-blue-600 ">{RunStatus.PENDING}</span>}
                                    {executionData?.status == RunStatus.STARTED && <span className="text-blue-600 ">{RunStatus.STARTED}</span>}

                    </div>

                    <div className="flex flex-row items-center space-x-4  py-2">
                        <Clock></Clock>
                        <span className="w-28"><strong>Created Date:</strong></span>
                        <span>{new Date(executionData?.created).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-row items-center space-x-4  py-2">
                        <Clock></Clock>
                        <span className="w-28"><strong>Updated Date:</strong></span>
                        <span>{new Date(executionData?.updated).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-row items-center space-x-4  py-2">
                        <Timer></Timer>
                        <span className="w-28"><strong>Execution Time:</strong></span>
                        <span>{getExecutionTime(executionData.created,executionData.updated)}</span>
                    </div>
                    <div className="flex flex-col py-2 space-x-4 w-1/2 ">{executionData?.steps && 
                    <div className="flex flex-row items-center space-x-4  py-2">
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
                                {renderJSONObject(executionData?.input,  "input", )}
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

