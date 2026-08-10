import { Loader2, MessageSquare } from "lucide-react";
import type { AgentDetail, Session } from "@/config/types";
import type { PendingChat } from "@/hooks/use-pending-chats";
import {
  describeToolTurn,
  messageContentToString,
} from "@/lib/agent-turns";
import { AgentToolTurn } from "@/components/AgentToolTurn";

type AgentTranscriptProps = {
  agent: AgentDetail;
  selectedAgentId: string | null;
  selectedSessionId: string | null;
  session: Session | null;
  pendingChat: PendingChat | null;
  echoAlreadyRecorded: boolean;
  transcriptRef: React.RefObject<HTMLDivElement | null>;
};

export function AgentTranscript({
  agent,
  selectedAgentId,
  selectedSessionId,
  session,
  pendingChat,
  echoAlreadyRecorded,
  transcriptRef,
}: AgentTranscriptProps) {
  return (
    <div
      ref={transcriptRef}
      data-testid="agent-transcript"
      className="flex-1 overflow-y-auto p-6 space-y-3 bg-background"
    >
      {!session?.conversation.length && !pendingChat && (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
          <MessageSquare size={32} className="mb-2" />
          {selectedSessionId ? (
            <p>This session has no messages yet.</p>
          ) : (
            <p>
              Send a message below to start a new chat session with{" "}
              {agent.agentId}.
            </p>
          )}
        </div>
      )}
      {session?.conversation.map((message, index) => {
        const isUser = message.role === "user";
        const isAssistant = message.role === "assistant";
        if (!isUser && !isAssistant) {
          return (
            <AgentToolTurn
              key={index}
              role={message.role}
              tool={describeToolTurn(message)}
              ts={message.ts}
            />
          );
        }

        const time = message.ts
          ? new Date(message.ts).toLocaleTimeString()
          : null;
        const title = time
          ? isAssistant
            ? `Reply from ${selectedAgentId ?? "agent"} at ${time}`
            : `Sent at ${time}`
          : undefined;

        return (
          <div
            key={index}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              title={title}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                isUser
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-foreground"
              }`}
            >
              {isUser && message.source === "request" && (
                <div
                  data-testid="turn-source-label"
                  className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1"
                >
                  task
                </div>
              )}
              {messageContentToString(message.content)}
            </div>
          </div>
        );
      })}
      {pendingChat && !echoAlreadyRecorded && (
        <div data-testid="pending-user-message" className="flex justify-end">
          <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words bg-blue-600 text-white">
            {pendingChat.text}
          </div>
        </div>
      )}
      {pendingChat && (
        <div data-testid="agent-thinking" className="flex justify-start">
          <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            <span className="italic text-muted-foreground">
              {agent.agentId} is thinking…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
