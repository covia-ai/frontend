import type { RefObject } from "react";
import { Bot, Loader2, MessageSquareText } from "lucide-react";

import { AgentToolTurnGroup } from "@/components/AgentToolTurn";
import type { Session } from "@/config/types";
import type { PendingChat } from "@/hooks/use-pending-chats";
import {
  describeToolTurn,
  groupTranscript,
  messageContentToString,
} from "@/lib/agent-turns";

type AgentConversationProps = {
  agentId: string;
  selectedSessionId: string | null;
  session: Session | null;
  pendingChat: PendingChat | null;
  echoAlreadyRecorded: boolean;
  transcriptRef: RefObject<HTMLDivElement | null>;
};

// The shared conversation surface for both the focused chat and the legacy
// explorer. Keeping turn rendering here prevents the two interfaces from
// drifting in typography, tool grouping, pending-message behavior, or source
// labelling while their surrounding controls remain intentionally different.
export function AgentConversation({
  agentId,
  selectedSessionId,
  session,
  pendingChat,
  echoAlreadyRecorded,
  transcriptRef,
}: AgentConversationProps) {
  const hasConversation = Boolean(session?.conversation.length || pendingChat);

  return (
    <div
      ref={transcriptRef}
      data-testid="agent-transcript"
      className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-background"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        {!hasConversation && (
          <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border bg-card shadow-sm">
              <MessageSquareText className="text-primary" size={23} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {selectedSessionId ? "No messages yet" : "How can I help?"}
            </h2>
            <p className="mt-2 max-w-md text-[15px] leading-6 text-muted-foreground">
              {selectedSessionId
                ? "This session does not contain any messages."
                : `Start a conversation with ${agentId}.`}
            </p>
          </div>
        )}

        {session?.conversation &&
          groupTranscript(session.conversation).map((item) => {
            if (item.kind === "toolGroup") {
              return (
                <div className="mb-6" key={item.index}>
                  <AgentToolTurnGroup
                    turns={item.messages.map((message) => ({
                      role: message.role,
                      tool: describeToolTurn(message),
                      ts: message.ts,
                    }))}
                  />
                </div>
              );
            }

            const { message, index } = item;
            const isUser = message.role === "user";
            const text = messageContentToString(message.content);
            const time = message.ts
              ? new Date(message.ts).toLocaleTimeString()
              : null;
            const title = time
              ? isUser
                ? `Sent at ${time}`
                : `Reply from ${agentId} at ${time}`
              : undefined;

            return isUser ? (
              <div className="mb-6 flex justify-end" key={index}>
                <div
                  title={title}
                  className="max-w-[85%] rounded-3xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap break-words"
                >
                  {message.source === "request" && (
                    <div
                      data-testid="turn-source-label"
                      className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Task
                    </div>
                  )}
                  {text}
                </div>
              </div>
            ) : (
              <div className="mb-8 flex gap-3" key={index}>
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card">
                  <Bot size={15} className="text-primary" />
                </div>
                <div
                  title={title}
                  className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-6"
                >
                  {text}
                </div>
              </div>
            );
          })}

        {pendingChat && !echoAlreadyRecorded && (
          <div data-testid="pending-user-message" className="mb-6 flex justify-end">
            <div className="max-w-[85%] rounded-3xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap break-words">
              {pendingChat.text}
            </div>
          </div>
        )}

        {pendingChat && (
          <div data-testid="agent-thinking" className="mb-8 flex items-center gap-3 text-muted-foreground">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-card">
              <Bot size={15} className="text-primary" />
            </div>
            <Loader2 size={15} className="animate-spin" />
            <span className="text-[15px] leading-6">Thinking…</span>
          </div>
        )}
      </div>
    </div>
  );
}
