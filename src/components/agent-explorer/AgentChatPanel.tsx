"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  History,
  BellRing,
  Loader2,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Settings,
  Trash2,
  X,
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
import { AgentConversation } from "@/components/AgentConversation";
import { AgentSettings } from "@/components/agent-config/AgentSettings";
import { AgentTimelineView } from "@/components/agent-explorer/AgentTimelineView";
import { AgentRuntimeSummary } from "@/components/agent-explorer/AgentRuntimeSummary";
import type { AgentExplorerController } from "@/hooks/use-agent-explorer";
import type { Session } from "@/config/types";
import { defaultSessionTitle, formatSessionLabel } from "@/lib/agent-sessions";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { cn, SUGGESTION_PLACEHOLDER_CLASS } from "@/lib/utils";

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
    pendingChat,
    sending,
    canSend,
    echoAlreadyRecorded,
    suspend,
    resume,
    triggerAgent,
    triggering,
    deleteAgent,
    updateAgentConfig,
    renameSession,
    startNewChat,
    selectSession,
    send,
  } = controller;
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [view, setView] = useState<"chat" | "timeline" | "settings">("chat");

  useEffect(() => {
    // Timeline/settings are scoped to the selected agent. A switch must not
    // leave the next agent showing the previous agent's secondary view.
    setView("chat");
  }, [selectedAgentId]);

  // Venue-persisted title (if set) beats the auto-derived first-message
  // title, which beats the raw timestamp/id/turns label — see
  // formatSessionLabel/defaultSessionTitle in @/lib/agent-sessions.
  const displayTitle = (session: Session): string =>
    session.title ?? defaultSessionTitle(session) ?? formatSessionLabel(session);

  const saveName = () => {
    if (selectedAgentId && selectedSessionId) {
      renameSession(selectedAgentId, selectedSessionId, nameDraft);
    }
    setRenaming(false);
  };

  useEffect(() => {
    // A session switch (or a rename left open when one happens) must not
    // leak the previous session's draft into the newly selected one.
    setRenaming(false);
  }, [selectedSessionId]);

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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="agent-settings-button"
                  aria-label="Agent settings"
                  aria-pressed={view === "settings"}
                  className={cn(
                    "hover:text-foreground",
                    view === "settings" ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => setView(view === "settings" ? "chat" : "settings")}
                >
                  <Settings size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Agent settings</TooltipContent>
            </Tooltip>
            {(selectedAgentDetail.timeline?.length ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="agent-timeline-info"
                    aria-label="Agent timeline"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setView("timeline")}
                  >
                    <History size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Timeline</TooltipContent>
              </Tooltip>
            )}
            <div className="ml-auto flex flex-row gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      triggering ||
                      selectedAgentDetail.status === AgentStatus.SUSPENDED ||
                      selectedAgentDetail.status === AgentStatus.TERMINATED
                    }
                  >
                    {triggering ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <BellRing size={14} className="mr-1" />
                    )}
                    Trigger now
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Trigger &quot;{selectedAgentDetail.agentId}&quot; now?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This starts an agent run cycle. It may use configured tools and model credits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={triggerAgent}>Trigger agent</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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

          <AgentRuntimeSummary sessions={sessions} />

          {view === "settings" ? (
            <AgentSettings
              key={selectedAgentDetail.agentId}
              agent={selectedAgentDetail}
              onBack={() => setView("chat")}
              onSave={updateAgentConfig}
            />
          ) : view === "timeline" ? (
            <AgentTimelineView
              agentId={selectedAgentDetail.agentId}
              onBack={() => setView("chat")}
            />
          ) : (
            <>
          <div className="px-6 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <MessageSquare size={16} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Session
            </span>
            {renaming ? (
              <div className="flex-1 max-w-md flex flex-row gap-1">
                <Input
                  data-testid="session-name-input"
                  autoFocus
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveName();
                    if (event.key === "Escape") setRenaming(false);
                  }}
                  placeholder="Name this session…"
                  className="h-8 text-sm"
                />
                <Button
                  aria-label="Save session name"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={saveName}
                >
                  <Check size={14} />
                </Button>
                <Button
                  aria-label="Cancel rename"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setRenaming(false)}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <>
                <div className="max-w-md">
                  <Select
                    value={selectedSessionId ?? "__new__"}
                    onValueChange={(value) => {
                      if (value === "__new__") startNewChat();
                      else selectSession(value);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="New session (no session yet)">
                        {selectedSessionId
                          ? displayTitle(
                              currentSession ?? {
                                sessionId: selectedSessionId,
                                conversation: [],
                              },
                            )
                          : sessions.length === 0
                            ? "No sessions yet — send a message to start one"
                            : "New session"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__">+ New session</SelectItem>
                      {sessions.map((session) => (
                        <SelectItem
                          key={session.sessionId}
                          value={session.sessionId}
                        >
                          {displayTitle(session)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSessionId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        data-testid="rename-session"
                        aria-label="Name this session"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setNameDraft(currentSession?.title ?? "");
                          setRenaming(true);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Name this session</TooltipContent>
                  </Tooltip>
                )}
                <Button
                  data-testid="new-session"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={startNewChat}
                  disabled={!hasChatSession}
                >
                  <Plus size={14} className="mr-1" /> New session
                </Button>
              </>
            )}
          </div>

          <AgentConversation
            agentId={selectedAgentDetail.agentId}
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
                  sending
                    ? "Waiting for the agent's reply…"
                    : canSend
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
                // disabled:opacity-100: the placeholder carries the reason
                // it's disabled (e.g. "SUSPENDED — cannot send") — Input's
                // default disabled:opacity-50 would fade that out further
                // on top of the already-dim SUGGESTION_PLACEHOLDER_CLASS
                // right when it matters most to read.
                className={cn("text-sm disabled:opacity-100", SUGGESTION_PLACEHOLDER_CLASS)}
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
            </>
          )}
        </>
      )}
    </div>
  );
}
