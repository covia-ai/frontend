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


const GraphView = (props:any) => {
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
       <div className="flex flex-row">
          
        </div>
    </div>
  );
};

export default GraphView;