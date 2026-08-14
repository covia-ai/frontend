import type { RefObject } from "react";
import Link from "next/link";
import { Bot, Copy, ExternalLink, Loader2, MessageSquareText } from "lucide-react";

import { AgentToolTurnGroup } from "@/components/AgentToolTurn";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Session } from "@/config/types";
import type { PendingChat } from "@/hooks/use-pending-chats";
import {
  describeToolTurn,
  groupTranscript,
  messageContentSections,
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
            // A structured delegation envelope ({task, expected_output}, …)
            // renders as labelled sections instead of raw JSON; the sections
            // carry their own labels, so the generic "Task" chip stands down.
            const sections = isUser ? messageContentSections(message.content) : null;
            const text = messageContentToString(message.content);
            const time = message.ts
              ? new Date(message.ts).toLocaleTimeString()
              : null;
            const title = time
              ? isUser
                ? `Sent at ${time}`
                : `Reply from ${agentId} at ${time}`
              : undefined;

            // The copyable form mirrors what the bubble displays: labelled
            // sections for delegation envelopes, plain text otherwise.
            const copyText = sections
              ? sections.map((s) => `${s.label}:\n${s.text}`).join("\n\n")
              : text;
            const jobId = typeof message.jobId === "string" && message.jobId
              ? (message.jobId.startsWith("0x") ? message.jobId : `0x${message.jobId}`)
              : null;

            return isUser ? (
              <div className="mb-6 flex justify-end" key={index}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      title={title}
                      data-testid="user-turn-bubble"
                      className="max-w-[85%] cursor-pointer rounded-3xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap break-words"
                    >
                      {message.source === "request" && !sections && (
                        <div
                          data-testid="turn-source-label"
                          className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          Task
                        </div>
                      )}
                      {sections ? (
                        <div className="space-y-2" data-testid="turn-sections">
                          {sections.map((section) => (
                            <div key={section.label}>
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {section.label}
                              </div>
                              {section.text}
                            </div>
                          ))}
                        </div>
                      ) : (
                        text
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      data-testid="turn-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(copyText).then(
                          () => notifySuccess("Message copied"),
                          (err: unknown) => notifyError("Unable to copy message", err),
                        );
                      }}
                    >
                      <Copy size={13} className="mr-1" /> Copy message
                    </DropdownMenuItem>
                    {jobId && (
                      <DropdownMenuItem asChild data-testid="turn-job-link">
                        <Link href={`/job/${encodeURIComponent(jobId)}`}>
                          <ExternalLink size={13} className="mr-1" /> Go to calling job
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="mb-8 flex gap-3" key={index}>
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card">
                  <Bot size={15} className="text-primary" />
                </div>
                <div
                  title={title}
                  className="min-w-0 flex-1 break-words text-[15px] leading-6"
                >
                  <MarkdownMessage>{text}</MarkdownMessage>
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
