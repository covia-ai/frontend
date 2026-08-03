"use client";

import { useEffect, useRef } from "react";
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { AgentStatus } from "@covia/covia-sdk";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { AgentTranscript } from "@/components/agent-explorer/AgentTranscript";
import type { AgentExplorerController } from "@/hooks/use-agent-explorer";
import { formatSessionLabel } from "@/lib/agent-sessions";
import { DEFAULT_AGENT_ID } from "@/config/agents";

export function AgentChatPanel({
  controller,
}: {
  controller: AgentExplorerController;
}) {
  const {
    selectedAgentId,
    selectedAgentDetail,
    detailLoading,
    detailError,
    sessions,
    hasChatSession,
    selectedSessionId,
    currentSession,
    messageText,
    setMessageText,
    detailsOpen,
    setDetailsOpen,
    pendingChat,
    sending,
    canSend,
    echoAlreadyRecorded,
    suspend,
    resume,
    deleteAgent,
    startNewChat,
    selectSession,
    send,
  } = controller;
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [currentSession?.conversation.length, sending]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {detailLoading && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {!detailLoading && !selectedAgentDetail && (
        <div
          data-testid={
            detailError ? "agent-detail-error" : "agent-detail-empty"
          }
          className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center"
        >
          <Bot size={32} />
          <p className="text-sm mt-2">
            {detailError
              ? `Couldn't load details for ${
                  selectedAgentId ?? "this agent"
                } — see the error notification.`
              : "Select an agent"}
          </p>
        </div>
      )}

      {!detailLoading && selectedAgentDetail && (
        <>
          <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <Bot
              size={20}
              className={
                selectedAgentDetail.agentId === DEFAULT_AGENT_ID
                  ? "text-primary dark:text-violet-300"
                  : "text-blue-600 dark:text-blue-400"
              }
            />
            <h3
              className={`text-lg font-bold font-mono ${
                selectedAgentDetail.agentId === DEFAULT_AGENT_ID
                  ? "text-primary dark:text-violet-300"
                  : "text-foreground"
              }`}
            >
              {selectedAgentDetail.agentId}
            </h3>
            <StatusBadge
              status={selectedAgentDetail.status}
              kind="agent"
              as="pill"
            />
            {(selectedAgentDetail.tasks ?? 0) > 0 && (
              <Badge variant="outline">
                {selectedAgentDetail.tasks} task
                {selectedAgentDetail.tasks === 1 ? "" : "s"}
              </Badge>
            )}
            <div className="ml-auto flex flex-row gap-2">
              {(selectedAgentDetail.status === AgentStatus.RUNNING ||
                selectedAgentDetail.status === AgentStatus.SLEEPING) && (
                <Button variant="outline" size="sm" onClick={suspend}>
                  <Pause size={14} className="mr-1" /> Suspend
                </Button>
              )}
              {selectedAgentDetail.status === AgentStatus.SUSPENDED && (
                <Button variant="outline" size="sm" onClick={resume}>
                  <Play size={14} className="mr-1" /> Resume
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete agent &quot;{selectedAgentDetail.agentId}&quot;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAgent}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <MessageSquare size={16} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Session
            </span>
            <div className="flex-1 max-w-md">
              <Select
                value={selectedSessionId ?? "__new__"}
                onValueChange={(value) => {
                  if (value === "__new__") startNewChat();
                  else selectSession(value);
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="New chat (no session yet)">
                    {selectedSessionId
                      ? formatSessionLabel(
                          currentSession ?? {
                            sessionId: selectedSessionId,
                            conversation: [],
                          },
                        )
                      : sessions.length === 0
                        ? "No sessions yet — send a message to start one"
                        : "New chat"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">+ New chat</SelectItem>
                  {sessions.map((session) => (
                    <SelectItem
                      key={session.sessionId}
                      value={session.sessionId}
                    >
                      {formatSessionLabel(session)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              data-testid="new-chat"
              variant="outline"
              size="sm"
              onClick={startNewChat}
              disabled={!hasChatSession}
            >
              <Plus size={14} className="mr-1" /> New chat
            </Button>
          </div>

          <AgentTranscript
            agent={selectedAgentDetail}
            selectedAgentId={selectedAgentId}
            selectedSessionId={selectedSessionId}
            session={currentSession}
            pendingChat={pendingChat}
            echoAlreadyRecorded={echoAlreadyRecorded}
            transcriptRef={transcriptRef}
          />

          <div className="px-6 py-3 border-t border-border bg-muted/20 flex flex-col gap-2">
            <div className="flex flex-row gap-2">
              <Input
                data-testid="composer-input"
                placeholder={
                  canSend
                    ? `Message ${selectedAgentDetail.agentId}…`
                    : `${selectedAgentDetail.status} — cannot send`
                }
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                className="text-sm"
                disabled={sending || !canSend}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="composer-send"
                    aria-label="Send message"
                    size="sm"
                    onClick={send}
                    disabled={sending || !canSend || !messageText.trim()}
                  >
                    {sending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send message</TooltipContent>
              </Tooltip>
            </div>
            {!canSend &&
              selectedAgentDetail.status === AgentStatus.SUSPENDED && (
                <p className="text-xs text-muted-foreground">
                  Resume the agent to send messages.
                </p>
              )}
          </div>

          <div className="border-t border-border bg-background">
            <button
              onClick={() => setDetailsOpen((visible) => !visible)}
              className="w-full px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 hover:bg-accent"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${
                  detailsOpen ? "" : "-rotate-90"
                }`}
              />
              Details
            </button>
            {detailsOpen && (
              <div className="px-6 pb-4 space-y-3 text-xs">
                {selectedAgentDetail.config && (
                  <div>
                    <div className="font-semibold mb-1 text-foreground">
                      Config
                    </div>
                    <pre className="font-mono bg-muted rounded px-2 py-2 overflow-x-auto">
                      {JSON.stringify(selectedAgentDetail.config, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedAgentDetail.stateConfig && (
                  <div>
                    <div className="font-semibold mb-1 text-foreground">
                      State Config (resolved)
                    </div>
                    <pre className="font-mono bg-muted rounded px-2 py-2 overflow-x-auto">
                      {JSON.stringify(
                        selectedAgentDetail.stateConfig,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
                {selectedAgentDetail.timeline &&
                  selectedAgentDetail.timeline.length > 0 && (
                    <div>
                      <div className="font-semibold mb-1 text-foreground">
                        Timeline ({selectedAgentDetail.timeline.length})
                      </div>
                      <pre className="font-mono bg-muted rounded px-2 py-2 overflow-x-auto max-h-48">
                        {JSON.stringify(
                          selectedAgentDetail.timeline,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
