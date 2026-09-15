import { memo, useMemo, type RefObject } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Loader2 } from "lucide-react";

import { AgentToolTurnGroup } from "@/components/AgentToolTurn";
import { AgentIdenticon } from "@/components/agent-roster/AgentIdenticon";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { humanizeAgentId } from "@/lib/agent-display";
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

// Shared by both turn kinds so the two copy affordances can't drift in what
// they put on the clipboard or how they report failure.
function copyMessage(text: string) {
  navigator.clipboard.writeText(text).then(
    () => notifySuccess("Message copied"),
    (err: unknown) => notifyError("Unable to copy message", err),
  );
}

type AgentConversationProps = {
  agentId: string;
  selectedSessionId: string | null;
  session: Session | null;
  pendingChat: PendingChat | null;
  echoAlreadyRecorded: boolean;
  transcriptRef: RefObject<HTMLDivElement | null>;
  /** The agent's brief (system-prompt snippet) shown in the new-chat empty
   *  state for context. Optional — the legacy explorer omits it. */
  agentBrief?: string;
  /** When set, the new-chat empty state offers starter-prompt chips that
   *  populate the composer. Optional. */
  onStarter?: (text: string) => void;
};

// Generic conversation starters — populate the composer so the person can
// tweak before sending. Agent-specific suggestions can come later.
const STARTER_PROMPTS = [
  "What can you do?",
  "Help me get started",
  "Summarise your recent activity",
];

// The shared conversation surface for both the focused chat and the legacy
// explorer. Keeping turn rendering here prevents the two interfaces from
// drifting in typography, tool grouping, pending-message behavior, or source
// labelling while their surrounding controls remain intentionally different.
//
// Memoised: the composer's draft text lives in the parent controller, so a
// keystroke re-renders the chat surface. None of this transcript's inputs
// change while typing, so `memo` keeps it inert until a message actually
// arrives — as long as callers pass stable props (notably a stable `onStarter`).
function AgentConversationBase({
  agentId,
  selectedSessionId,
  session,
  pendingChat,
  echoAlreadyRecorded,
  transcriptRef,
  agentBrief,
  onStarter,
}: AgentConversationProps) {
  const hasConversation = Boolean(session?.conversation.length || pendingChat);
  const agentName = humanizeAgentId(agentId);
  // Grouping walks the whole transcript; memoise so it recomputes only when the
  // conversation itself changes, never on an unrelated parent re-render.
  const groups = useMemo(
    () => (session?.conversation ? groupTranscript(session.conversation) : []),
    [session?.conversation],
  );

  return (
    <div
      ref={transcriptRef}
      data-testid="agent-transcript"
      className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-background"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        {!hasConversation && (
          <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
            <AgentIdenticon agentId={agentId} className="mb-5 size-16" />
            <h2 className="text-2xl font-semibold tracking-tight">
              {selectedSessionId ? "No messages yet" : `Chat with ${agentName}`}
            </h2>
            <p className="mt-2 max-w-md text-[15px] leading-6 text-muted-foreground">
              {selectedSessionId
                ? "This session does not contain any messages."
                : agentBrief
                  ? <span className="line-clamp-3">{agentBrief}</span>
                  : `Send a message to start working with ${agentName}.`}
            </p>
            {!selectedSessionId && onStarter && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    data-testid="chat-starter"
                    onClick={() => onStarter(prompt)}
                    className="rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {groups.map((item) => {
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
                  {/* Radix supplies this trigger's aria-haspopup and its
                      Enter/Space/ArrowDown handling, but `asChild` over a plain
                      div left it out of the tab order, so none of that keyboard
                      behaviour could ever fire and the menu — Copy message, and
                      Go to calling job — was mouse-only (frontend#243). The
                      explicit tabIndex and role are what a real <button> would
                      have given Radix; a button element can't be used here
                      because the bubble renders block children.

                      The ring is on `focus:`, not the `focus-visible:` every
                      ui/ primitive uses — Chrome does not match :focus-visible
                      on a div[tabindex] the way it does on a real button, so a
                      focus-visible ring never renders here and a keyboard user
                      gets no position cue. Ring tokens otherwise match
                      ui/button.tsx. */}
                  <DropdownMenuTrigger asChild>
                    <div
                      title={title}
                      role="button"
                      tabIndex={0}
                      data-testid="user-turn-bubble"
                      className="max-w-[85%] cursor-pointer rounded-3xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap break-words outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
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
                      onClick={() => copyMessage(copyText)}
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
              <div className="group mb-8 flex gap-3" key={index}>
                <AgentIdenticon agentId={agentId} className="mt-0.5 size-7 shrink-0" />
                <div
                  title={title}
                  className="min-w-0 flex-1 break-words text-[15px] leading-6"
                >
                  <MarkdownMessage>{text}</MarkdownMessage>
                  {/* The user bubble opens its menu on a click anywhere in the
                      bubble, which would fight text selection and link clicks
                      in rendered markdown — so the reply gets its own button
                      under the text instead. Revealed on hover, and on
                      keyboard focus so it is reachable without a pointer. */}
                  <button
                    type="button"
                    data-testid="agent-turn-copy"
                    aria-label="Copy reply"
                    onClick={() => copyMessage(copyText)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Copy size={13} /> Copy
                  </button>
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
            <AgentIdenticon agentId={agentId} className="size-7 shrink-0" />
            <Loader2 size={15} className="animate-spin" />
            <span className="text-[15px] leading-6">Thinking…</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const AgentConversation = memo(AgentConversationBase);
