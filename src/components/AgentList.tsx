"use client";

import { AddNewAgent } from "./AddNewAgent";
import { ContentLayout } from "./admin-panel/content-layout";
import { Bot, Loader2, SquareChevronRight, Lock }from "lucide-react";
import { Card } from "./ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopBar } from "./admin-panel/TopBar";
import { AgentListItem } from "@/config/types";
import { SeparatorWithText } from "@/components/SeparatorWithText";
import { AgentTemplates } from "./AgentTemplates";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { toastError } from "@/lib/toast-error";
import { normalizeAgentEntries } from "@/lib/agent-list";
import { PageHeading } from "./PageHeading";
import { StatusBadge } from "./StatusBadge";

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
      setAgentData(normalizeAgentEntries(result.agents));
    }).catch((err: any) => {
      toastError("Unable to load agents", err, venue.baseUrl);
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

   return (<ContentLayout>
     <TopBar/>
 <AgentTemplates onCreated={fetchAgents} />
 <SeparatorWithText text="or"/>
     <div className="flex flex-row items-center justify-between w-full pt-10">
       <PageHeading
         className={agentData.length > 0 ? undefined : "w-full"}
         align={agentData.length > 0 ? "left" : "center"}
         text={agentData.length > 0 ? "Choose an existing" : "Create a new"}
         highlight="agent"
       />
       {agentData.length > 0 && (
         <div className="flex items-center gap-2 shrink-0">
           {isAuthenticated ? (
             <>
               <AddNewAgent onCreated={fetchAgents} />
               <Button
                 variant="outline"
                 className="shrink-0 gap-2"
                 data-testid="explorer-trigger"
                 onClick={() => router.push('/agents/explorer')}
               >
                 <SquareChevronRight size={14} />
                 Explorer
               </Button>
             </>
           ) : (
             <Button variant="outline" disabled className="gap-2 text-muted-foreground">
               <Lock size={14} />
               Sign in to create agents
             </Button>
           )}
         </div>
       )}
     </div>
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
      {agentData.length > 0 && <div className="flex flex-col items-center justify-center space-y-4">

         <div className="mt-10 w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch justify-center gap-4">

            {agentData.map((agent) => (
              <Card
                   key={agent.agentId}  onClick={() => handleCardClick(agent.agentId)}
                   className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2
                       ${ compact ? 'h-32 p-1' : 'h-48 p-2'  }`}>
                   {/* Fixed-size header */}
                   <div className={` ${ compact ? 'h-10' : 'h-14'  } p-2 flex flex-row items-start border-b`}>
                      <div data-testid="agent-name" className="truncate flex-1 mr-2 text-md text-foreground font-mono"> {agent.agentId}</div>
                      {agent.status && <StatusBadge status={agent.status} kind="agent" as="dot" className="ml-1" />}
                    </div>
                   {/* Flexible middle section */}
                   <div className="flex-1 p-2 flex flex-col justify-between">
                     <div className={` ${ compact ? 'line-clamp-2' : 'line-clamp-3' } text-xs text-card-foreground `}>
                         {agent.status}
                     </div>
                   </div>

                   {/* Fixed-size footer */}
                   <div className="p-1 h-8 flex flex-row-reverse" >
                       {agent.tasks != null && (
                         <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">{agent.tasks} task{agent.tasks !== 1 ? 's' : ''}</Badge>
                       )}
                   </div>
                 </Card>
            ))}

         </div>
      </div>
      }
     
     </ContentLayout>
  );
} 