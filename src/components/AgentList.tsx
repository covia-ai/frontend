"use client";

import { AddNewAgent } from "./AddNewAgent";
import { ContentLayout } from "./admin-panel/content-layout";

import { SmartBreadcrumb } from "./ui/smart-breadcrumb";

import { Bot } from "lucide-react";
import { Card } from "./ui/card";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge";
import { RunStatus } from "@/lib/covia";
import { useEffect, useState } from "react";

 interface Agent {
  id:string;
  name:string;
  noOfStates:number;
  created:string;
  lastUpdated:string;
  llm:string;
  state:RunStatus;
  venueId:string;

}
export function AgentList() {
  const router = useRouter();
  const [agentData, setAgentData] = useState<Agent[]>([]);

  useEffect(() => {

    const mockData = [
      {
        "id" : "agent1",
        "name" : "Customer Support Agent",
        "noOfStates" : 12,
        "created" : "Nov 24 12:10 pm",
        "lastUpdated" : "Nov 24 12:40 am",
        "llm" : "Claude 3.5",
        "state" : RunStatus.COMPLETE,
        "venueId" : "did:web:venue-test.covia.ai"
      },
      {
         "id" : "agent2",
        "name" : "Data Analysis Agent",
        "noOfStates" : 47,
         "created" : "Nov 24 8:10 pm",
         "lastUpdated" : "Nov 24 9:10pm",
         "llm" : "Gemini Pro",
         "state" : RunStatus.STARTED,
        "venueId" : "did:web:venue-test.covia.ai"
      },
      {
         "id" : "agent3",
        "name" : "Code Review Agent",
        "noOfStates" : 8,
         "created" : "Nov 24 4:10 pm",
        "lastUpdated" : "Nov 24 4:35pm",
        "llm" : "Claude 3.5",
        "state" : RunStatus.FAILED,
        "venueId" : "did:web:venue-test.covia.ai"
      },
    ]
    setAgentData(mockData);
  },[])
  const handleCardClick = (agentId:string) => {
        const encodedUrl = "/agents/"+agentId;
        router.push(encodedUrl);
    };


   return (<ContentLayout>
     <SmartBreadcrumb/>
     {agentData.length == 0 &&  <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
            <Bot size={64} className="text-primary"></Bot>
            <div className="text-primary text-lg">Get Started with Agents</div>
            <AddNewAgent></AddNewAgent>
      </div>}
      {agentData.length > 0 && <div className="flex flex-col items-center justify-center space-y-4">
         <div className="mt-10 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
            {agentData.map((agent) => (
               <Card key={agent.id}
               onClick={() => handleCardClick(agent.id)}
               className="shadow-md border-2 h-full bg-card flex flex-col rounded-md hover:border-accent hover:border-2 h-48">
                              {/* Fixed-size header */}
                              <div className="h-14 p-2 flex flex-row items-center border-b bg-card-banner space-x-2">
                                 {agent.state == RunStatus.COMPLETE &&   <Badge className="bg-green-400 h-2 min-w-2 rounded-full px-1 "></Badge>}
                                 {agent.state == RunStatus.STARTED &&   <Badge className="bg-blue-400 h-2 min-w-2 rounded-full px-1 "></Badge>}
                                 {agent.state == RunStatus.FAILED &&   <Badge className="bg-red-400 h-2 min-w-2 rounded-full px-1 "></Badge>}

                                 <div data-testid = "agent-header" className="truncate flex-1 mr-2 text-md text-foreground"
                                 >{agent.name || 'Unnamed Agent'}
                                 </div>      
                              </div>
               
                              {/* Flexible middle section */}
                              <div className="flex-1 p-2 flex flex-col justify-between text-sm" >
                                 <div data-testid="asset-description" className="p-1 text-xs text-slate-300 line-clamp-3">{agent.created}</div>
                              </div>
               
                              {/* Fixed-size footer */}
                              <div className="p-2 h-12 flex flex-row items-center justify-between text-sm" onClick={() => handleCardClick(agent.id)}>
                                 {agent.state == RunStatus.COMPLETE && <Badge variant="outline" className="bg-green-600/50 rounded-sm text-slate-300">{agent.state}</Badge>}
                                 {agent.state == RunStatus.STARTED && <Badge variant="outline" className="bg-blue-600/50 rounded-sm text-slate-300">{agent.state}</Badge>}
                                 {agent.state == RunStatus.FAILED && <Badge variant="outline" className="bg-red-600/50 rounded-sm text-slate-300">{agent.state}</Badge>}

                                 <span className="text-xs p-1"> {agent.llm} </span>
                                 
                              </div>
                              <div className="p-2 h-12 flex flex-row items-center justify-between text-sm">
                                 <span className="text-xs text-foreground p-1">{agent.noOfStates} <span className="text-slate-400">steps</span> </span>
                              </div>
                     </Card>
            ))}
      
         </div>
         <AddNewAgent></AddNewAgent>
      </div>
         }
     
     </ContentLayout>
  );
} 