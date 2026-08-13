"use client";

import { AddNewAgent } from "./AddNewAgent";
import { ContentLayout } from "./admin-panel/content-layout";
import { AlertTriangle, Bot, Loader2, SquareChevronRight, Lock, LogOut, Users }from "lucide-react";
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
import { useAuthStore, useCurrentAuth } from "@/hooks/use-auth";
import { notifyError } from "@/lib/notify";
import { normalizeAgentEntries } from "@/lib/agent-list";
import { PageHeading } from "./PageHeading";
import { StatusBadge } from "./StatusBadge";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { reportVenueAuthHealth, useVenueAccessState } from "@/hooks/use-venue-auth-health";
import { errorMessage, errorStatus, isAuthenticationRejectedError } from "@/lib/errors";

export function AgentList({ mode = "view" }: { mode?: "create" | "view" }) {
  const router = useRouter();
  const [agentData, setAgentData] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const compact = true;
  const venue = useAuthenticatedVenue();
  const auth = useCurrentAuth();
  const logout = useAuthStore((state) => state.logout);
  const access = useVenueAccessState(venue?.venueId);
  const canUseAgents = access.state === "accepted" || access.state === "unverified";

  const fetchAgents = () => {
    if (!venue || !canUseAgents) {
      setAgentData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    venue.agents.list(true).then((result) => {
      if (auth) reportVenueAuthHealth(venue.venueId, auth, { state: "accepted" });
      setAgentData(normalizeAgentEntries(result.agents));
    }).catch((err: unknown) => {
      if (auth && isAuthenticationRejectedError(err)) {
        reportVenueAuthHealth(venue.venueId, auth, {
          state: "rejected",
          detail: errorMessage(err, "This venue rejected the stored account"),
          status: errorStatus(err),
        });
        return;
      }
      notifyError("Unable to load agents", err, venue.baseUrl);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, canUseAgents]);

  const handleCardClick = (agentId: string) => {
    const encodedUrl = "/agents/explorer?agentId=" + agentId;
    router.push(encodedUrl);
  };

   // Once agents exist, the list itself is what the user wants to act on —
   // it goes on top, with the template picker demoted below as a secondary
   // "or start from a template" path. Before that (no agents yet), there's
   // nothing to list, so the template picker is the primary way in and
   // leads.
   const hasAgents = !loading && agentData.length > 0;

   const agentTemplates = <AgentTemplates />;
   const orSeparator = <SeparatorWithText text="or"/>;

   const createOrChooseSection = (
     <div className="w-full pt-10">
       <PageHeading
         className="w-full"
         align="center"
         text={hasAgents ? "Choose an existing" : "Create a new"}
         highlight="agent"
       />
       {hasAgents && (
         <div className="flex items-center justify-center gap-2 shrink-0 mt-4">
           {canUseAgents ? (
             <>
               <AddNewAgent />
               <Button
                 variant="outline"
                 className="shrink-0 gap-2"
                 data-testid="explorer-trigger"
                 onClick={() => router.push('/agents/explorer')}
               >
                 <SquareChevronRight size={14} />
                 Explore
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
   );

   const loadingSpinner = loading && (
     <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" size={32} /></div>
   );

   const emptyState = !loading && agentData.length == 0 && (
     <div className="flex flex-col items-center justify-center w-full space-y-2 pt-4">
            <Bot size={48} className="text-primary"></Bot>
            {canUseAgents ? (
              <AddNewAgent />
            ) : (
              <Button variant="outline" disabled className="gap-2 text-muted-foreground">
                <Lock size={14} />
                Sign in to create agents
              </Button>
            )}
      </div>
   );

   const agentGrid = agentData.length > 0 && (
      <div className="flex flex-col items-center justify-center space-y-4">

         <div className="mt-10 w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch justify-center gap-4">

            {agentData.map((agent) => {
              const isAssistant = agent.agentId === DEFAULT_AGENT_ID;
              return (
              <Card
                   key={agent.agentId}  onClick={() => handleCardClick(agent.agentId)}
                   className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md hover:border-2
                       ${ isAssistant ? 'border-primary/40 hover:border-primary' : 'border-muted hover:border-accent' }
                       ${ compact ? 'h-32 p-1' : 'h-48 p-2'  }`}>
                   {/* Fixed-size header */}
                   <div className={` ${ compact ? 'h-10' : 'h-14'  } p-2 flex flex-row items-center border-b`}>
                      {isAssistant && (
                        <div className="flex-shrink-0 flex items-center justify-center rounded-full size-6 bg-primary/15 dark:bg-primary/25 mr-1.5">
                          <Bot size={14} className="text-primary dark:text-violet-300" />
                        </div>
                      )}
                      <div data-testid="agent-name" className={`truncate flex-1 mr-2 text-md font-mono ${isAssistant ? 'text-primary dark:text-violet-300' : 'text-foreground'}`}> {agent.agentId}</div>
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
              );
            })}

         </div>
      </div>
   );

   const agentListSection = (
     <>
       {createOrChooseSection}
       {loadingSpinner}
       {hasAgents ? agentGrid : emptyState}
     </>
   );

   const showAgentListFirst = mode === "view" && hasAgents;

   if (access.state === "checking") {
     return (
       <ContentLayout>
         <TopBar />
         <div className="flex min-h-80 items-center justify-center gap-2 text-muted-foreground" role="status">
           <Loader2 className="animate-spin text-primary" size={24} />
           Checking venue account…
         </div>
       </ContentLayout>
     );
   }

   if (access.state === "rejected") {
     return (
       <ContentLayout>
         <TopBar />
         <div className="mx-auto mt-16 flex max-w-2xl flex-col items-center gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center" data-testid="agent-auth-rejected">
           <AlertTriangle className="text-destructive" size={40} />
           <div>
             <h2 className="text-lg font-semibold">This venue rejected the stored account</h2>
             <p className="mt-2 text-sm text-muted-foreground">
               Sign out and choose an admitted account, or ask the venue administrator to provision this identity.
             </p>
             <p className="mt-2 break-words font-mono text-xs text-muted-foreground">{access.detail}</p>
           </div>
           <div className="flex flex-wrap justify-center gap-2">
             <Button variant="outline" onClick={() => venue && logout(venue.venueId)}>
               <LogOut size={14} /> Sign out
             </Button>
             <Button onClick={() => router.push("/profile")}>
               <Users size={14} /> Manage accounts
             </Button>
           </div>
         </div>
       </ContentLayout>
     );
   }

   return (<ContentLayout>
     <TopBar/>
     {showAgentListFirst ? (
       <>
         {agentListSection}
         {orSeparator}
         {agentTemplates}
       </>
     ) : (
       <>
         {agentTemplates}
         {orSeparator}
         {agentListSection}
       </>
     )}
     </ContentLayout>
  );
}
