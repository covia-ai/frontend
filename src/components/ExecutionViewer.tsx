
'use client'

import { useEffect, useState } from "react";
import { Asset, RunStatus, Venue } from "@/lib/covia/covialib";
import { Calendar, Check, Clock, Copyright, Database, Eye, EyeIcon, FileInput, FileOutput, Hash, InfoIcon, Map, Quote, Tag, Timer, User, X } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

export const ExecutionViewer = (props:any) => {
      
        const [venue, setVenue] = useState<Venue>();
        const [executionData, setExecutionData] = useState({})
          
        useEffect(() => {
          const venue = new Venue();
          venue.connect().then((venueObj) => {
              setVenue(venue);
              venueObj.getJob(props.jobId).then(( response) => {
                  console.log(response)
                  setExecutionData(response);
            })
          })
      }, []);
            
      function renderOutput() {
          if(executionData?.output != undefined) {
            
                let key = Object.keys(executionData?.output);
                let value = executionData?.output[key];
                 
                return (
                    <Table className="border border-slate-200 rounded-md py-2">
                        <TableHeader>
                            <TableRow className="bg-slate-200">
                                 <TableCell className="text-left ">Name</TableCell>
                                 <TableCell className="text-left ">Value</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody >
                            <TableRow>
                                 <TableCell className="text-v ">{key}</TableCell>
                                 <TableCell className="text-left ">{value}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                     
                )
                
          }
      }
      function renderInput() {

      }
        return (
           <>
                 {executionData && (
                
                <div className="flex flex-col w-full items-center justify-center">
                    
                <div className="flex flex-row border-1 shadow-md rounded-md border-slate-200 w-11/12 mt-8 p-4 items-center justify-between">
                  <div className="flex flex-col">
                     <div className="flex flex-row items-center space-x-4 py-2">
                                    {executionData?.status == RunStatus.COMPLETED && <Check></Check>}
                                    {executionData?.status == RunStatus.FAILED &&  <X></X>}
                                    <span><strong>Status:</strong></span>
                                   {executionData?.status == RunStatus.COMPLETED && <span className="text-green-600 ">Successful</span>}
                                   {executionData?.status == RunStatus.FAILED && <span className="text-red-600 ">Failed</span>}
                    </div>
                    <div className="flex flex-row items-center space-x-4  py-2">
                        <Clock></Clock>
                        <span><strong>Date:</strong></span>
                        <span>{executionData?.executionDate}</span>
                </div>
                    <div className="flex flex-row  py-2 space-x-4 ">
                        <div className="flex flex-row space-x-4 "><FileOutput></FileOutput>
                        <span><strong>Output:</strong></span></div>
                        {executionData?.status == RunStatus.COMPLETED && renderOutput()}
                         {executionData?.status == RunStatus.FAILED &&  executionData?.error}
                        
                </div>
                <div className="flex flex-col  py-2 space-x-4 ">
                        <div className="flex flex-row space-x-4 "><FileInput></FileInput>
                        <span><strong>Input:</strong></span></div>
                    
                </div>
                       
               </div>  
              </div>
             
              </div>
            )  
            }  
                
           </>
           
      );
};

