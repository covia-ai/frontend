
'use client'

import { useEffect, useState } from "react";
import { RunStatus, Venue } from "@/lib/covia/covialib";
import { Check, Clock,  FileInput, FileOutput, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { MdOutlinePendingActions } from "react-icons/md";
import { usePolling } from "@/hooks/use-polling"
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useRouter } from "next/navigation";
export const ExecutionViewer = (props:any) => {
        const router = useRouter()
        const [executionData, setExecutionData] = useState({})
        const [poll, setPollStatus] = useState("");

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

      function renderJSONObject(jsonObject: JSON, type:string) {
          
          if(jsonObject != undefined) {
            
                let keys = new Array();

                if(type == "input") 
                      keys = Object.keys(executionData?.input);
                else 
                     keys = Object.keys(executionData?.output);       
                 
                if(keys != undefined && keys.length > 0) {
                    return (
                        <Table className="border border-slate-200 rounded-md py-2">
                            <TableHeader>
                                <TableRow className="bg-slate-200">
                                    <TableCell className="text-left ">Name</TableCell>
                                    <TableCell className="text-left ">Value</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody >
                                {keys.map((key,index) => (
                                <TableRow>
                                    <TableCell key={index} className="text-left">{key}</TableCell>
                                    <TableCell className="text-left ">{jsonObject[key]}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                    )
                }
                else {
                    return (
                       <div>
                         {type == "input" && <div>No input provided</div>}
                         {type == "output" && <div>No output</div>}
                       </div>

                    )
                }
                
          }
      }
      
        return (
           <> 
                 {executionData && (
                
                <div className="flex flex-col w-full items-center justify-center">
                    
                <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-11/12 mt-8 p-4 items-center justify-between">
                  <div className="flex flex-col">
                     <div className="flex flex-row items-center space-x-4 py-2">
                                    {executionData?.status == RunStatus.COMPLETE && <Check></Check>}
                                    {executionData?.status == RunStatus.FAILED &&  <X></X>}
                                    {executionData?.status == RunStatus.PENDING &&  <MdOutlinePendingActions />}
                                    <span className="w-28"><strong>Status:</strong></span>
                                    {executionData?.status == RunStatus.COMPLETE && <span className="text-green-600 ">{RunStatus.COMPLETE}</span>}
                                    {executionData?.status == RunStatus.FAILED && <span className="text-red-600 ">{RunStatus.FAILED}</span>}
                                    {executionData?.status == RunStatus.PENDING && <span className="text-blue-600 ">{RunStatus.PENDING}</span>}
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
                     {executionData?.status != RunStatus.FAILED && <div className="flex flex-row  py-2 space-x-4 ">
                        <div className="flex flex-row space-x-4 "><FileOutput></FileOutput>
                        <span className="w-28"><strong>Output:</strong></span></div>
                         {renderJSONObject(executionData?.output, "output")}
                         {executionData?.status == RunStatus.FAILED && <div>{executionData?.error}</div>}
                       
                        
                    </div>}
                    {executionData?.status == RunStatus.FAILED && <div className="flex flex-row  py-2 space-x-4 ">
                        <div className="flex flex-row space-x-4 "><FileOutput></FileOutput>
                        <span className="w-28"><strong>Error:</strong></span></div>
                         <div>{executionData?.error}</div>
                       
                        
                    </div>}
                <div className="flex flex-row  py-2 space-x-4 ">
                        <div className="flex flex-row space-x-4 "><FileInput></FileInput>
                        <span className="w-28"><strong>Input:</strong></span></div>
                        {renderJSONObject(executionData?.input, "input")}
                </div>
                       
               </div>  
              </div>
             
              </div>
            )  
            }  
                
           </>
           
      );
};

