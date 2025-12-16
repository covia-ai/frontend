"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Clock1, MapPin, User } from 'lucide-react';
import { getExecutionTime } from '@/lib/utils';
import { AgentHeader } from './AgentHeader';
import { ScrollArea } from './ui/scroll-area';

interface Step {
  id:number;
  title:string;
  updated:string;
  description:string;
  head:boolean;
}


const TimelinePanel = (props:any) => {
  const [timelineData, setTimelineData] = useState<Step[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Step>();
  const [headEntry, setHeadEntry] = useState<Step>();

  const getTypeColor = (head:boolean, isSelected: boolean) => {
    if(head)
      return "bg-green-500"
    if(isSelected)
      return "bg-blue-500";
    return "bg-gray-500";
  };

  useEffect(() => {
 
     const mockData = [
        {
          id: 9,
          title: "Task 9",
          updated: "2025-11-24T10:23:00",
          description: "Help customer with refund request.",
          head:true
          
        },
        {
          id: 8,
          title: "Task 8",
          updated: "2025-11-24T10:15:00",
          description: "Check order status for customer 4564.",
          head:false
        },
        {
          id: 7,
          title: "Task 7",
          updated: "2025-11-24T10:05:00",
          description: "Process return authorization.",
          head:false
        },
        {
          id: 6,
          title: "Task 6",
          updated: "2025-11-24T10:00:00",
          description: "Answer shipping question.",
          head:false
        },
         {
          id: 5,
          title: "Task 5",
          updated: "2025-11-24T10:00:00",
          description: "Reply to customer request.",
          head:false
        },
        {
          id: 4,
          title: "Task 4",
          updated: "2025-11-24T10:00:00",
          description: "Reply to customer request.",
          head:false
        },
        {
          id: 3,
          title: "Task 3",
          updated: "2025-11-24T10:00:00",
          description: "Reply to customer request.",
          head:false
        },
        {
          id: 2,
          title: "Task 2",
          updated: "2025-11-24T10:00:00",
          description: "Reply to customer request.",
          head:false
        },
         {
          id: 1,
          title: "Task 1",
          updated: "2025-11-24T10:00:00",
          description: "Reply to customer request.",
          head:false
        }
    ];
     setTimelineData(mockData);
     setSelectedEntry(mockData[0])
     setHeadEntry(mockData[0])
   },[])

  return (
    <div className="flex flex-col">
       <AgentHeader agentId={props.id} step={selectedEntry?.id} venueName="Test Venue"/>
       <div className="flex flex-row">
          {/* Left Panel - Timeline */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-2">
              <div className=" flex  mb-2">Timeline</div>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                 <ScrollArea className="h-screen w-100">
                  {timelineData.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`relative pl-8 pb-4 cursor-pointer transition-all w-11/12 ${
                        selectedEntry?.id === entry.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                      }`}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full ${getTypeColor(entry.head, selectedEntry?.id === entry.id )} ring-4 ring-white`}></div>
                      
                      <Card className={`${selectedEntry?.id === entry.id ? 'border-blue-500 shadow-md p-2' : 'border-gray-200 p-2'}` }>
                        <CardHeader className="">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-thin">{entry.title}</CardTitle>
                           <div className="flex flex-row space-x-1 text-xs text-slate-400">
                                <Clock1 className="w-4 h-4" />
                                <span>{getExecutionTime(entry.updated, new Date().toDateString())}</span>
                              </div>
                          </div>
                          <CardDescription className="flex flex-col  gap-2  bg-card text-card-foreground">
                            
                                <div className="text-sm text-muted-foreground"> {entry.description}</div>
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="flex-1 overflow-y-auto p-8 mt-2 h-screen">
              <Card className="max-w-3xl mx-auto h-screen">
              <CardHeader>
                <div className="flexflex-col items-start  mb-4 bg-card text-card-foreground">
                  <div className="flex flex-row items-start justify-between">
                    <CardTitle className="text-2xl font-thin mb-2">{selectedEntry?.title}</CardTitle>
                    {selectedEntry?.head && <Badge className={`${getTypeColor(selectedEntry.head, false)} w-fit`}>
                  HEAD
                  </Badge>}
                  </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock1 className="w-5 h-5" />
                        <span>{getExecutionTime(selectedEntry?.updated, new Date().toDateString())}</span>
                      </div>
                      
                    </div>
                  
                
                </div>
                
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className=" leading-relaxed">{selectedEntry?.description}</p>
                </div>

              

            
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
};

export default TimelinePanel;