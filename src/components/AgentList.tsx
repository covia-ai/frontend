"use client";

import { AddNewAgent } from "./AddNewAgent";
import { ContentLayout } from "./admin-panel/content-layout";
import { Bot, Clock, Footprints, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useRouter } from "next/navigation";
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from "react";
import { TopBar } from "./admin-panel/TopBar";
import agentsJson from "@/components/public/mockAgent.json"
import { Agent } from "@/config/types";

export function AgentList() {
  const router = useRouter();
  const [agentData, setAgentData] = useState<Agent[]>([]);

  useEffect(() => {
    setAgentData(agentsJson as any);
  },[agentData])
  
  const handleCardClick = (agentId:string) => {
        const encodedUrl = "/agents/"+agentId;
        router.push(encodedUrl);
    };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'ACTIVE':
        return { variant: 'default', className: 'bg-blue-500 hover:bg-blue-600' };
      case 'COMPLETED':
        return { variant: 'default', className: 'bg-green-500 hover:bg-green-600' };
      case 'TERMINATED':
        return { variant: 'destructive', className: '' };
      default:
        return { variant: 'secondary', className: '' };
    }
  };

   return (<ContentLayout>
     <TopBar/>
     {agentData.length == 0 &&  <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
            <Bot size={64} className="text-primary"></Bot>
            <div className="text-primary text-lg">Get Started with Agents</div>
            <AddNewAgent></AddNewAgent>
      </div>}
      {agentData.length > 0 && <div className="flex flex-col items-center justify-center space-y-4">
         <div className="mt-10 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
            {agentData.map((agent) => (
               
                  <Card
                     key={agent.agent.id}
                     onClick={() => handleCardClick(agent.agent.id)}
                     className="h-full bg-card border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-900/50 transition-all duration-200 cursor-pointer group overflow-hidden"
                  >
                <CardHeader className="pb-1 bg-card border-b border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg font-medium text-white  transition-colors line-clamp-1">
                      {agent.agent.name || 'Unnamed Agent'}
                    </CardTitle>
                   
                      <Badge
                      variant={getStatusConfig(agent.agent.status).variant}
                      className={`shrink-0 text-xs font-medium ${getStatusConfig(agent.agent.status).className}`}
                    >
                      {agent.agent.status}
                    </Badge>
                    
                  </div>
                  <CardDescription className="text-slate-400 text-sm line-clamp-2 mt-2">
                    {agent.agent.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2  rounded-lg p-1 border border-slate-800">
                      <Bot size={16} className="text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{agent.agent.provider}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2  rounded-lg p-1 border border-slate-800">
                      <MapPin size={16} className="text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{agent.agent.venueId}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2  rounded-lg p-1 border border-slate-800">
                      <Footprints size={16} className="text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200">{agent.agent.totalSteps.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2  rounded-lg p-1 border border-slate-800">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{agent.agent.lastRun}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      
         </div>
         <AddNewAgent></AddNewAgent>
      </div>
         }
     
     </ContentLayout>
  );
} 