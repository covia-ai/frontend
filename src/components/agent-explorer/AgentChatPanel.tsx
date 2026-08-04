"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  History,
  Info,
  Loader2,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { ConfigFields } from "@/components/agent-explorer/ConfigFields";
import { AgentTimelineView } from "@/components/agent-explorer/AgentTimelineView";
import type { AgentExplorerController } from "@/hooks/use-agent-explorer";
import { formatSessionLabel } from "@/lib/agent-sessions";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { useVenues } from "@/hooks/use-venues";
import { sessionNameKey, useSessionNames } from "@/hooks/use-session-names";

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
    deleteAgent,
    startNewChat,
    selectSession,
    send,
  } = controller;
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const venueId = useVenues((state) => state.selectedVenueId);
  const sessionNames = useSessionNames((state) => state.names);
  const setSessionName = useSessionNames((state) => state.setName);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    // Switching agents while viewing a timeline must not leave the next
    // agent's chat area stuck showing timeline (or a stale one, before its
    // own detail has even loaded).
    setShowTimeline(false);
  }, [selectedAgentId]);

  const nameFor = (sessionId: string): string | undefined =>
    venueId && selectedAgentId
      ? sessionNames[sessionNameKey(venueId, selectedAgentId, sessionId)]
      : undefined;

  const saveName = () => {
    if (venueId && selectedAgentId && selectedSessionId) {
      setSessionName(
        sessionNameKey(venueId, selectedAgentId, selectedSessionId),
        nameDraft,
      );
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
            {(selectedAgentDetail.config || selectedAgentDetail.stateConfig) && (
              <Dialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <button
                        data-testid="agent-config-info"
                        aria-label="Agent configuration"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Info size={16} />
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Config</TooltipContent>
                </Tooltip>
                <DialogContent className="w-[75vw] max-w-[75vw] sm:max-w-[75vw] h-[75vh] max-h-[75vh] bg-card text-card-foreground overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedAgentDetail.agentId} — Configuration
                    </DialogTitle>
                  </DialogHeader>
                  <Separator />
                  <div className="space-y-5 text-xs">
                    {selectedAgentDetail.config && (
                      <div>
                        <div className="font-semibold mb-2 text-foreground text-sm">
                          Config
                        </div>
                        <ConfigFields data={selectedAgentDetail.config} />
                      </div>
                    )}
                    {selectedAgentDetail.stateConfig && (
                      <div>
                        <div className="font-semibold mb-2 text-foreground text-sm">
                          State Config (resolved)
                        </div>
                        <ConfigFields data={selectedAgentDetail.stateConfig} />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {(selectedAgentDetail.timeline?.length ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="agent-timeline-info"
                    aria-label="Agent timeline"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setShowTimeline(true)}
                  >
                    <History size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Timeline</TooltipContent>
              </Tooltip>
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

          {showTimeline ? (
            <AgentTimelineView
              agentId={selectedAgentDetail.agentId}
              onBack={() => setShowTimeline(false)}
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
                <div className="flex-1 max-w-md">
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
                          ? (nameFor(selectedSessionId) ??
                            formatSessionLabel(
                              currentSession ?? {
                                sessionId: selectedSessionId,
                                conversation: [],
                              },
                            ))
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
                          {nameFor(session.sessionId) ??
                            formatSessionLabel(session)}
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
                          setNameDraft(nameFor(selectedSessionId) ?? "");
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
                  onClick={startNewChat}
                  disabled={!hasChatSession}
                >
                  <Plus size={14} className="mr-1" /> New session
                </Button>
              </>
            )}
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
            </>
          )}
        </>
      )}
    </div>
  );
}
