"use client";

import { AddNewAgent } from "./AddNewAgent";
import { ContentLayout } from "./admin-panel/content-layout";
import { Bot, Clock, Loader2, SquareChevronRight, Lock } from "lucide-react";
import { Card } from "./ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopBar } from "./admin-panel/TopBar";
import { AgentListItem } from "@/config/types";
import { SeperatorWithText } from "@/components/SeperatorWithText";
import { AgentTemplates } from "./AgentTemplates";
import { AgentSearch } from "./AgentSearch";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { AgentStatus } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { toast } from "sonner";

export function AgentList() {
  const router = useRouter();
  const [agentData, setAgentData] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const compact = true;
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const fetchAgents = () => {
    if (!venue) return;
    setLoading(true);
    venue.agents.list(true).then((result) => {
      setAgentData(result.agents || []);
    }).catch(() => {
      toast("Unable to load agents");
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

  const handleCardClick = (agentId: string) => {
    const encodedUrl = "/agents/explorer?agentId=" + agentId;
    router.push(encodedUrl);
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case AgentStatus.RUNNING:
        return { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' };
      case AgentStatus.SLEEPING:
        return { variant: 'default', className: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' };
      case AgentStatus.SUSPENDED:
        return { variant: 'default', className: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600' };
      case AgentStatus.TERMINATED:
        return { variant: 'destructive', className: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600' };
      default:
        return { variant: 'secondary', className: 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600' };
    }
  };

   return (<ContentLayout>
     <TopBar/>
 <AgentTemplates onCreated={fetchAgents} />
 <SeperatorWithText text="or"/>
     <h3 className="text-center text-4xl  font-thin pt-10">
          {agentData.length > 0 ? "Choose an existing" : "Create a new"}  {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
             agent ...
            </span>
        </h3>
     {loading && <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" size={32} /></div>}
     {!loading && agentData.length == 0 &&  <div className="flex flex-col items-center justify-center w-full space-y-2 pt-4">
            <Bot size={48} className="text-primary"></Bot>
            {isAuthenticated ? (
              <AddNewAgent onCreated={fetchAgents} />
            ) : (
              <Button variant="outline" disabled className="gap-2 text-muted-foreground">
                <Lock size={14} />
                Sign in to create agents
              </Button>
            )}
      </div>}
      <div className="flex flex-row-reverse w-full">
       <SquareChevronRight onClick={() => router.push('/agents/explorer')}/>
      </div>
      {agentData.length > 0 && <div className="flex flex-col items-center justify-center space-y-4">

         <div className="mt-10 w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch justify-center gap-4">

            {agentData.map((agent) => (
              <Card
                   key={agent.agentId}  onClick={() => handleCardClick(agent.agentId)}
                   className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2
                       ${ compact ? 'h-32 p-1' : 'h-48 p-2'  }`}>
                   {/* Fixed-size header */}
                   <div className={` ${ compact ? 'h-10' : 'h-14'  } p-2 flex flex-row items-start border-b`}>
                      <div data-testid="agent-name" className="truncate flex-1 mr-2 text-md text-foreground"> {agent.agentId}</div>
                      <div className={`w-2 h-2 rounded-full shadow-lg ml-1 ${getStatusConfig(agent.status).className}`}></div>
                    </div>
                   {/* Flexible middle section */}
                   <div className="flex-1 p-2 flex flex-col justify-between">
                     <div className={` ${ compact ? 'line-clamp-2' : 'line-clamp-3' } text-xs text-card-foreground `}>
                         {agent.status}
                     </div>
                   </div>

                   {/* Fixed-size footer */}
                   <div className="p-1 h-8 flex flex-row-reverse" >
                       <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">{agent.tasks} task{agent.tasks !== 1 ? 's' : ''}</Badge>
                   </div>
                 </Card>
            ))}

         </div>
         {isAuthenticated ? (
           <AddNewAgent onCreated={fetchAgents} />
         ) : (
           <Button variant="outline" disabled className="gap-2 text-muted-foreground">
             <Lock size={14} />
             Sign in to create agents
           </Button>
         )}
      </div>
      }
     
     </ContentLayout>
  );
} 