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
   // Absent when the entry came from the lean GET /api/v1/agents shape
   // (bare ids) rather than the enriched agent:list op.
   status?: string;
   tasks?: number;
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
   /** Free-form human-facing title, venue-persisted (AGENT_SESSIONS.md §4.3). */
   title?: string;
}
