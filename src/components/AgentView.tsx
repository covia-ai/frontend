"use client"

import GraphView from "@/components/GraphView";
import TimelinePanel from "@/components/Timelinepanel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Agent } from "@/config/types";
import { getStatusConfig } from "@/lib/utils";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Bot, Clock, Footprints, MapPin } from "lucide-react";

interface AgentProps {
  agent: Agent;
}

export const AgentView = ({ agent }: AgentProps) => {
    const [activeTab, setActiveTab] = useState("timeline")
    const handleTabChange = (value) => {
        setActiveTab(value);
    }
    return (
        <div>
          <div className=" my-4 w-full flex flex-row justify-between">
             <div className="flex flex-col space-y-2 space-x-2 ">
              <div className="text-lg">{agent.agent.name}</div>
               <div className="flex flex-row space-x-4 text-xs text-slate-400">
                  <Badge
                      variant={getStatusConfig(agent.agent.status).variant}
                      className={`shrink-0 text-xs font-medium ${getStatusConfig(agent.agent.status).className}`}
                    >
                    {agent.agent.status}
                  </Badge>
                  <div className="flex flex-center gap-1"> <Clock size={16} className="text-blue-400 shrink-0" />Last Run: {agent.agent.lastRun}</div>
                  <div className="flex flex-center gap-1"> <Bot size={16} className="text-amber-400 shrink-0" /> Provider: {agent.agent.provider}</div>
                  <div className="flex flex-center gap-1"> <Footprints size={16} className="text-purple-400 shrink-0" /> Steps: {agent.agent.totalSteps}</div>
                  <div className="flex flex-center gap-1">  <MapPin size={16} className="text-emerald-400 shrink-0" />Venue: {agent.agent.venueId}</div>
                                    
                </div>
              </div>
            <div >
              <Tabs defaultValue={activeTab} className="w-full" onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="timeline" className="w-28">Timeline</TabsTrigger>
                  <TabsTrigger value="graph" className="w-28">Graph</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          {activeTab == "timeline" && <div className="mt-4"><TimelinePanel agent={agent}/></div>}
          {activeTab == "graph" && <div className="mt-4">Graph</div>}
      </div>
    )
}