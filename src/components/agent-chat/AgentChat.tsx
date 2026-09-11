"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AgentStatus } from "@covia/covia-sdk";
import { ArrowUpRight, Bot, Cpu, Loader2, MessageSquarePlus, RotateCcw, Send } from "lucide-react";

import { AgentConversation } from "@/components/AgentConversation";
import { AgentIdenticon } from "@/components/agent-roster/AgentIdenticon";
import { StatusBadge } from "@/components/StatusBadge";
import { agentDisplay, humanizeAgentId } from "@/lib/agent-display";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";
import { defaultSessionTitle, formatSessionLabel } from "@/lib/agent-sessions";
import { agentSendingPlaceholder } from "@/lib/agent-chat";
import { cn, SUGGESTION_PLACEHOLDER_CLASS } from "@/lib/utils";

type AgentChatProps = {
  initialAgentId?: string;
  fixedAgent?: boolean;
};

const NEW_SESSION_VALUE = "__new__";

export function AgentChat({ initialAgentId, fixedAgent = false }: AgentChatProps) {
  const controller = useAgentExplorer(initialAgentId);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const {
    agentList,
    selectedAgentId,
    setSelectedAgentId,
    selectedAgentDetail,
    loading,
    detailLoading,
    detailError,
    sessions,
    hasChatSession,
    selectedSessionId,
    currentSession,
    messageText,
    setMessageText,
    pendingChat,
    sending,
    activity,
    canSend,
    echoAlreadyRecorded,
    resume,
    startNewChat,
    selectSession,
    send,
  } = controller;

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [currentSession?.conversation.length, sending]);

  const sessionLabel = (session: (typeof sessions)[number]) =>
    session.title ?? defaultSessionTitle(session) ?? formatSessionLabel(session);

  if (loading || detailLoading) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center" role="status">
        <Loader2 className="animate-spin text-primary" size={24} />
        <span className="sr-only">Loading chat</span>
      </div>
    );
  }

  if (!selectedAgentDetail || !selectedAgentId) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border bg-card">
          <Bot size={22} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">
          {detailError ? "Unable to open this agent" : "No agents yet"}
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {detailError
            ? "The selected agent could not be loaded from this venue."
            : "Create an agent to start a conversation."}
        </p>
        <Button asChild className="mt-5">
          <Link href="/agents/create">Create an agent</Link>
        </Button>
      </div>
    );
  }

  const isSuspended = selectedAgentDetail.status === AgentStatus.SUSPENDED;
  const display = agentDisplay(selectedAgentDetail.config);
  const agentName = humanizeAgentId(selectedAgentId);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] min-h-[36rem] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      <header className="flex min-h-14 flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-5">
        {fixedAgent ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <AgentIdenticon agentId={selectedAgentId} className="size-8" />
            <span className="truncate text-sm font-semibold">{agentName}</span>
          </div>
        ) : (
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger
              aria-label="Agent"
              className="h-10 w-auto gap-2 border-0 bg-transparent px-1.5 shadow-none"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <AgentIdenticon agentId={selectedAgentId} className="size-8" />
                <span className="truncate text-sm font-semibold">{agentName}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {agentList.map((agent) => (
                <SelectItem key={agent.agentId} value={agent.agentId}>
                  <span className="flex items-center gap-2">
                    <AgentIdenticon agentId={agent.agentId} className="size-5" />
                    {humanizeAgentId(agent.agentId)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <StatusBadge status={selectedAgentDetail.status} kind="agent" as="pill" />
        <span className="hidden items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
          <Cpu size={11} /> {display.model || display.providerLabel}
        </span>

        <div className="ml-auto flex min-w-0 items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <Link href={`/agents/agent/${encodeURIComponent(selectedAgentId)}`}>
              Profile <ArrowUpRight size={13} />
            </Link>
          </Button>
          <Select
            value={selectedSessionId ?? NEW_SESSION_VALUE}
            onValueChange={(value) =>
              value === NEW_SESSION_VALUE ? startNewChat() : selectSession(value)
            }
          >
            <SelectTrigger
              data-testid="clean-session-picker"
              className="h-9 max-w-[13rem] border-0 bg-transparent shadow-none sm:max-w-[18rem]"
            >
              <SelectValue placeholder="New chat" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={NEW_SESSION_VALUE}>New chat</SelectItem>
              {sessions.map((session) => (
                <SelectItem key={session.sessionId} value={session.sessionId}>
                  {sessionLabel(session)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            data-testid="clean-new-session"
            variant="ghost"
            size="icon"
            aria-label="New chat"
            onClick={startNewChat}
            disabled={!hasChatSession}
          >
            <MessageSquarePlus size={17} />
          </Button>
        </div>
      </header>

      {isSuspended && (
        <div className="flex items-center justify-center gap-3 border-b bg-muted/40 px-4 py-2 text-sm">
          <span className="text-muted-foreground">This agent is suspended.</span>
          <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={resume}>
            <RotateCcw size={13} /> Resume
          </Button>
        </div>
      )}

      <AgentConversation
        agentId={selectedAgentId}
        selectedSessionId={selectedSessionId}
        session={currentSession}
        pendingChat={pendingChat}
        echoAlreadyRecorded={echoAlreadyRecorded}
        transcriptRef={transcriptRef}
        agentBrief={display.brief}
        onStarter={setMessageText}
      />

      <footer className="bg-gradient-to-t from-background via-background to-transparent px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-card p-2 pl-4 shadow-sm transition-shadow focus-within:shadow-md">
          <Textarea
            data-testid="clean-composer-input"
            aria-label={`Message ${selectedAgentId}`}
            placeholder={
              sending
                ? agentSendingPlaceholder(activity)
                : canSend
                  ? `Message ${selectedAgentId}…`
                  : "This agent cannot receive messages"
            }
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            disabled={sending || !canSend}
            rows={1}
            className={cn(
              "max-h-40 min-h-10 resize-none border-0 bg-transparent px-0 py-2 text-[15px] leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent disabled:opacity-100 md:text-[15px]",
              SUGGESTION_PLACEHOLDER_CLASS,
            )}
          />
          <div className="flex items-center justify-end">
            <Button
              data-testid="clean-composer-send"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Send message"
              onClick={send}
              disabled={sending || !canSend || !messageText.trim()}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
