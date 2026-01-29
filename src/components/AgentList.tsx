"use client";

import { AddNewAgent } from "./AddNewAgent";
import { ContentLayout } from "./admin-panel/content-layout";
import { Bot, Clock, Footprints, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopBar } from "./admin-panel/TopBar";
import agentsJson from "@/components/public/mockAgent.json"
import { Agent } from "@/config/types";
import { Input } from "./ui/input";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { SeperatorWithText } from "@/components/SeperatorWithText";
import { Button } from "./ui/button";

export function AgentList() {
  const router = useRouter();
  const [agentData, setAgentData] = useState<Agent[]>([]);
  const compact = true;
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
        return { variant: 'destructive', className: 'bg-red-500 hover:bg-red-600' };
      default:
        return { variant: 'secondary', className: 'bg-gray-500 hover:bg-gray-600' };
    }
  };

   return (<ContentLayout>
     <TopBar/>
      <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10"> 
        <h3 className="text-center text-4xl  font-thin">
          Locate your  {" "}
           <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              agent ..
            </span>   
        </h3>
        <div className="flex flex-col md:flex-row lg:flex-row items-center justify-center w-full space-x-2 space-y-2 ">
                <Input
                placeholder="What is thy bidding, my master"
                className="bg-card placeholder:text-gray-400 my-2"
                aria-label="prompt"
              />
              
         <Button  aria-label="Run" role="button" data-testid="chat-button" variant="default" className="my-4 btn btn-xs mx-0 bg-primary dark:bg-primary-light text-white"><MagicWandIcon/></Button>
        </div>
</div>
 <SeperatorWithText text="or"/>
     <h3 className="text-center text-4xl  font-thin pt-10">
          Choose an existing  {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
             agent ...
            </span> 
        </h3>
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
                     className={` shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2 
          ${ compact ? 'h-32 p-2' : 'h-48 p-2' }`}>
                <CardHeader className={` ${ compact ? 'h-10' : 'h-14' } p-2 flex flex-row items-center border-b bg-card-banner`}>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex flex-row">
                      <div className="text-lg font-medium text-white  transition-colors line-clamp-1">Customer Support</div>
                      <div className={`w-3 h-3 rounded-full shadow-lg ml-1 ${getStatusConfig(agent.agent.status).className}`}></div>
                    </CardTitle>  
                  </div>
                  
                </CardHeader>
                <CardContent className="flex flex-col space-x-2 px-1">
                  <div className="flex-1 flex flex-col justify-between text-sm">
                    {agent.agent.description}
                  </div>
                      <div className="flex flex-row-reverse space-x-4 bottom-0 ">
                        
                        <div className="text-xs font-thin text-slate-200 truncate">{agent.agent.lastRun}</div>
                        <Clock size={14} className="text-amber-400 shrink-0" />
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