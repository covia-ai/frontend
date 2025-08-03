
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
        if(poll != RunStatus.FAILED && poll != RunStatus.COMPLETE) {
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
                let keys = new Array(); // keys of the input or output
                let inOutType = "", assetLink ="";
                let schema={}; 
                if(type == "input") {
                    keys = Object.keys(executionData?.input);
                    schema = assetsMetadata?.metadata?.operation?.input;
                    inOutType = schema?.type;
                } else {
                    schema = assetsMetadata?.metadata?.operation?.output;
                    inOutType = schema?.type;
                    keys = Object.keys(executionData?.output);
                }
                if(inOutType == "asset")
                      assetLink = window.location.href+"/venues/default/assets/"+assetsMetadata?.id;

                // render function for each key within the input or output like "prompt" or "image"
                let renderContent = key=>{
                    let fieldType=schema?.properties?.[key]?.type || "object";
                    let text=JSON.stringify(jsonObject[key]);
                    return <TableCell className="flex-2 text-wrap">{text}</TableCell>;
                }
                
                // render function for the type each key within the input or output like "string" or "asset"
                let renderType = key=>{
                   let fieldType=schema?.properties?.[key]?.type || "object";
                   return  <TableCell className="text-center text-slate-600">{fieldType}</TableCell>;
                }

                if(keys != undefined && keys.length > 0) {
                    return (
                        <Table className="border border-slate-200 rounded-md py-2">
                            <TableHeader>
                                <TableRow className="bg-slate-200">
                                    <TableCell >Name</TableCell>
                                    <TableCell >Value</TableCell>
                                    {inOutType && <TableCell>Type</TableCell>}
                                </TableRow>
                            </TableHeader>
                            <TableBody >
                                {keys.map((key,index) => (
                                <TableRow key={index}>
                                    {type == "input" && <TableCell key={index} className="font-bold bg-yellow-200">{key}</TableCell>}
                                    {type == "output" && <TableCell key={index} className="font-bold bg-blue-200">{key}</TableCell>}
                                    {renderContent(key)}
                                    {renderType(key)}
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                
                    )
                } else {
                    return <div>No data</div>
                }
          }
      }
      
        return (
           <> 
                 {executionData && (
                
                <div className="flex flex-col w-full items-center justify-center">
                  <div className="flex flex-row-reverse space-x-2 space-x-reverse w-full"> 
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

