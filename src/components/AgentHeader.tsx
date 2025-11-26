"use client"

import { ChangeLLMProvider } from "./ChangeLLMProvider";
import CloneToVenue from "./CloneToVenue";
import { ForkAgent } from "./ForkAgent";
import SendRequest from "./SendRequest";
import { Card } from "./ui/card";


export function AgentHeader(props:any) {
    return (
        <Card className="flex flex-col items-center justify-center w-full space-y-2 space-x-2 my-2 bg-card text-card-foreground">
                <div className="text-lg">Agent Name: {props.agentId}</div>
                <div className="flex flex-row my-2 space-x-2">
                    <SendRequest agentId={props.id}/>
                     <ForkAgent step={props.step} agentId={props.id}/> 
                     <ChangeLLMProvider agentId={props.id}/>
                      <CloneToVenue agentId={props.id} venueName={props.venueName}/>
                </div>
        </Card>
    )
}