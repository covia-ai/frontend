"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Clock1, MapPin, User } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Agent, AgentData, AgentSteps } from '@/config/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getStatusConfig } from '@/lib/utils';


const TimelinePanel = (props:any) => {
  const [selectedEntry, setSelectedEntry] = useState<AgentSteps>();
  const getTypeColor = (head:boolean, isSelected: boolean) => {
    if(head)
      return "bg-green-500"
    if(isSelected)
      return "bg-blue-500";
    return "bg-gray-500";
  };
  const agent = props.agent as Agent;
  const agentSteps = agent.steps;

  useEffect(() => {
      setSelectedEntry(agentSteps[0]);
    },[])
  return (
    <div className="flex flex-col">
       <div className="flex flex-row">
          {/* Left Panel - Timeline */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto">
            <div className="p-2">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 "></div>
                
                 <ScrollArea className="h-screen w-100 ">
                  {agentSteps.map((entry, index) => (
                    <div
                      key={entry.stepId}
                      className={`relative pl-8 pb-4 cursor-pointer transition-all w-11/12 mt-8 ${
                        selectedEntry?.stepId === entry.stepId ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                      }`}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full ${getTypeColor(entry.head, selectedEntry?.id === entry.id )} ring-4 ring-white`}></div>
                      
                      <Card className={`w-48 h-36 flex flex-col my-auto ${selectedEntry?.stepId === entry.stepId ? 'border-blue-500 shadow-md p-2' : 'border-gray-200 p-2'}` }>
                        <CardHeader className="">
                            <CardTitle className="text-white text-md font-thin">{entry.stepName}</CardTitle>
                                <span className="text-sm text-slate-400">Job {entry.jobId}</span>
                                 <Badge
                                                     variant={getStatusConfig(entry?.status)}
                                                     className={`shrink-0 text-xs font-medium ${getStatusConfig(entry?.status).className}`}
                                                   >
                                                   {entry?.status}
                                  </Badge>
                        </CardHeader>
                      </Card>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </div>
           {/* Right Panel - Timeline */}
            <div className="flex-1 overflow-y-auto p-8 mt-2 h-fit">
              <Card className="max-w-3xl mx-auto h-fit">
              <CardHeader className="">
                <div className="flex flex-col items-start bg-card p-2 rounded-md">
                  <div className="flex flex-row items-start justify-between w-full">
                    <CardTitle className="text-2xl font-thin mb-2 space-x-2 flex flex-row items-center">
                      <span>{selectedEntry?.stepName} </span>
                      <Badge
                                                     variant={getStatusConfig(selectedEntry?.status)}
                                                     className={`shrink-0 text-xs font-medium ${getStatusConfig(selectedEntry?.status).className}`}
                                                   >
                                                   {selectedEntry?.status}
                                  </Badge></CardTitle>
                     <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock1 className="w-5 h-5" />
                        <span>{selectedEntry?.timestamp}</span>
                      </div>
                  </div>
                  <CardDescription className="text-sm text-slate-400">{selectedEntry?.description}</CardDescription>
                </div>
                
              </CardHeader>
              <CardContent className="">
                  <div className="flex flex-row space-x-2">
                     <Badge variant="primary" className="bg-slate-600/50 text-slate-300 text-xs"> Job {selectedEntry?.jobId}</Badge>
                     <Badge variant="primary" className="bg-slate-600/50  text-slate-300 text-xs">  {agent?.agent.provider}</Badge>
                     <Badge variant="primary" className="bg-slate-600/50  text-slate-300 text-xs">  {selectedEntry?.venueId}</Badge>
                   </div>
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full"
                      defaultValue="na"
                    >
                    <AccordionItem value="item-1 ">
                      <AccordionTrigger className="p-2 mt-4">View Input Outputs</AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <div className="bg-slate-600/50 text-slate-300 p-2 rounded-md">
                            {selectedEntry?.input && Object.entries(selectedEntry?.input).map(([key, value]) => (
                            <div key={key} className='grid grid-cols-4  space-y-1'>
                               <div className="text-xs text-gray-400 col-span-1">{key} : </div> 
                               <div className="text-xs text-gray-100 border-slate-100 ml-2 col-span-3">{value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-slate-600/50 text-slate-300 p-2 rounded-md">
                          {selectedEntry?.output && Object.entries(selectedEntry?.output).map(([key, value]) => (
                            <div key={key} className='grid grid-cols-4 space-y-1'>
                               <div className="text-xs text-gray-400 col-span-1">{key} : </div> 
                               <div className="text-xs text-gray-100 border-slate-100 ml-2 col-span-3">{value}</div>
                            </div>
                          ))}
                       </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
              </CardContent>
            </Card>
          </div>

         
        </div>
    </div>
  );
};

export default TimelinePanel;