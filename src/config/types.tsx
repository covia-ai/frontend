export type TimelineSize = 'sm' | 'md' | 'lg';
export type TimelineStatus = 'completed' | 'in-progress' | 'pending';
export type TimelineColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'destructive';

export interface AgentDetail {
   agentId: string;
   status: string;
   tasks?: number;
   timelineLength?: number;
   config?: Record<string, any>;
   stateConfig?: Record<string, any>;
   state?: Record<string, any>;
   timeline?: any[];
   [key: string]: any;
}

export interface AgentListItem {
   agentId: string;
   status: string;
   tasks: number;
}

export interface SessionMessage {
   role: string;
   content: any;
   ts?: number;
   source?: string;
}

export interface Session {
   sessionId: string;
   created?: number;
   parties?: string[];
   turns?: number;
   pending?: any[];
   conversation: SessionMessage[];
}
export interface AgentSteps {
  stepNumber:number,
  stepId:string,
  stepName:string,
  stepType:string,
  description:string,
  timestamp:string,
  output: {
    [key: string]: string;
  },
   input: {
    [key: string]: string;
  }
  status: string;
  venueId: string;
  jobId: string;
}

export interface VenueDetails {
  name: string;
  id: string;
  description: string;
  type: string;
  endpoint:string;
}
export interface AssetDetails {
  name?: string  | undefined;
  id?: string  | undefined;
  description?: string  | undefined;
  type?: string  | undefined;
  tag?:string   | undefined;
  version?:string   | undefined;
  creator?:string   | undefined;
  license?:string   | undefined;
  venue?:string | undefined;
  assetType?:string | undefined;
  private?:boolean | undefined;
  data?: AssetValue[];
}
export interface AssetValue {
  value:string;
}
export interface OperationDetails {
  name?: string | undefined;
  id?: string | undefined;
  description?: string ;
  type?: string | undefined;
  tag?: string | undefined;
  orchestration?:boolean | undefined;
  operation?: Operation;
}
export interface Operation {
  params?: Params[];
  results?: Results;
}
export interface Params {
  name?: string | undefined;
  type?: string | undefined;
  description?: string | undefined;
  position?: number | undefined;
  required?: boolean | undefined;
}

export interface Results {
  value: Value;
}
export interface Value {
  type?: string | undefined; 
  description?: string | undefined;
}

export interface AssetId {
  id:string;
}


