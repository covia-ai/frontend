"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  GripVertical, Bot, Pause, Play, Trash2, Send, Loader2,
  Plus, MessageSquare, ChevronDown
} from 'lucide-react';
import { AgentDetail, AgentListItem, Session, SessionMessage } from '@/config/types';
import { TopBar } from './admin-panel/TopBar';
import { Agent, ChatSession, AgentStatus } from '@covia/covia-sdk';
import { useAuthenticatedVenue } from '@/hooks/use-authenticated-venue';
import { usePendingChats, findPendingChat } from '@/hooks/use-pending-chats';
import { usePaneResize } from '@/hooks/use-pane-resize';
import { toast } from 'sonner';
import { toastError } from '@/lib/toast-error';
import { normalizeAgentEntries } from '@/lib/agent-list';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { StatusBadge } from './StatusBadge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { gtmEvent } from "@/lib/utils";
import { messageContentToString, describeToolTurn } from "@/lib/agent-turns";
import { AgentToolTurn } from "./AgentToolTurn";

const POLL_INTERVAL_MS = 3000;
const SESSION_LIMIT = 50;
const SEND_TIMEOUT_MS = 30_000;

const AgentExplorer = (props: any) => {
  const venue = useAuthenticatedVenue();

  // Agent list + selection
  const [agentList, setAgentList] = useState<AgentListItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(props.agentId || null);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  // Agent handle + chat session (OO API from SDK 1.5.0)
  const [agentHandle, setAgentHandle] = useState<Agent | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  // A null chatSession is ambiguous on its own: it means both "nothing picked
  // yet", which the auto-select below resolves, and "the user asked for a fresh
  // chat", which it must leave alone. This tells the two apart.
  const [newChatRequested, setNewChatRequested] = useState(false);

  // Sessions + chat
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messageText, setMessageText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  // In-flight sends live in a shared store rather than local state, so a chat
  // dispatched from anywhere — this composer, the home prompt, another screen
  // — is echoed here, and survives navigating away and back mid-send.
  const pendingChats = usePendingChats((s) => s.pendingChats);
  const startPendingChat = usePendingChats((s) => s.startPendingChat);
  const attachSessionId = usePendingChats((s) => s.attachSessionId);
  const clearPendingChat = usePendingChats((s) => s.clearPendingChat);

  // A send for this agent not yet bound to a session — the venue is still
  // minting one, so the transcript has to follow it when it surfaces.
  const awaitingNewSession = !!selectedAgentId
    && pendingChats.some((c) => c.agentId === selectedAgentId && c.sessionId === null);

  // Layout
  const { width: leftWidth, containerRef, startResizing } = usePaneResize(200);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  // Poll-driven refreshes stay silent (a transient blip would toast every
  // 3 s); the initial load surfaces its cause so an unreachable venue or
  // rejected token doesn't masquerade as "No agents found".
  const refreshAgentList = useCallback((surfaceErrors = false) => {
    if (!venue) return Promise.resolve();
    return venue.agents.list(true).then((result) => {
      setAgentList(normalizeAgentEntries(result.agents));
    }).catch((err: any) => {
      if (surfaceErrors) toastError("Unable to load agents", err, venue.baseUrl);
    });
  }, [venue]);

  // Agent detail = lightweight info() + the timeline the Details panel dumps.
  // Replaces the removed agents.query(), which bundled info plus timeline/state/
  // inbox reads (4 jobs); we only render info-fields + timeline, so state/inbox
  // are dropped. info() and the timeline read are job-free on venues that serve
  // the values API; on older ones they fall back to invoke via the SDK.
  const loadAgentDetail = useCallback((agentId: string): Promise<AgentDetail | null> => {
    if (!venue) return Promise.resolve(null);
    return Promise.all([
      venue.agents.info(agentId),
      venue.workspace.read(`g/${agentId}/timeline`)
        .then((r) => (Array.isArray(r?.value) ? r.value : []))
        .catch(() => []),
    ])
      .then(([info, timeline]) => ({ ...info, timeline } as AgentDetail))
      .catch(() => null);
  }, [venue]);

  const refreshAgentDetail = useCallback((agentId: string | null) => {
    if (!agentId) return Promise.resolve();
    return loadAgentDetail(agentId).then((detail) => {
      if (detail) setSelectedAgentDetail(detail);
    });
  }, [loadAgentDetail]);

  const refreshSessions = useCallback((agentId: string | null) => {
    if (!venue || !agentId) return Promise.resolve();
    return venue.workspace
      .slice(`g/${agentId}/sessions`, 0, SESSION_LIMIT)
      .then((res) => {
        const items: Session[] = ((res?.values as any[]) || []).map((entry) => {
          const sid = String(entry?.key ?? "");
          const v = entry?.value || {};
          const meta = v.meta || {};
          const frames = Array.isArray(v.frames) ? v.frames : [];
          const conversation: SessionMessage[] = frames.flatMap((f: any) =>
            Array.isArray(f?.conversation) ? f.conversation : []
          );
          return {
            sessionId: sid,
            created: meta.created,
            parties: meta.parties,
            turns: meta.turns,
            pending: Array.isArray(v.pending) ? v.pending : [],
            conversation,
          };
        });
        items.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
        setSessions(items);
      })
      .catch(() => setSessions([]));
  }, [venue]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Initial agent list load
  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    refreshAgentList(true).finally(() => setLoading(false));
  }, [venue, refreshAgentList]);

  // Auto-select first agent when list arrives
  useEffect(() => {
    if (agentList.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agentList[0].agentId);
    }
  }, [agentList, selectedAgentId]);

  // Reload detail + sessions when agent changes
  useEffect(() => {
    setChatSession(null);
    setNewChatRequested(false);
    setSessions([]);
    if (!venue || !selectedAgentId) {
      setAgentHandle(null);
      setSelectedAgentDetail(null);
      return;
    }
    const handle = venue.agent(selectedAgentId);
    setAgentHandle(handle);
    setDetailLoading(true);
    setDetailError(false);
    Promise.all([
      loadAgentDetail(selectedAgentId)
        .then((detail) => {
          if (detail) setSelectedAgentDetail(detail);
          else {
            toast("Unable to load agent details");
            setSelectedAgentDetail(null);
            setDetailError(true);
          }
        }),
      refreshSessions(selectedAgentId),
    ]).finally(() => setDetailLoading(false));
  }, [venue, selectedAgentId, loadAgentDetail, refreshSessions]);

  // Auto-select the most recent session — held while a send is still waiting on
  // a session the venue has yet to mint. Without the hold the transcript pins
  // to whichever session was newest when the send went out, putting an
  // unrelated conversation above the pending message; with it the message sits
  // on a blank transcript until the send settles and its real session appears.
  useEffect(() => {
    if (!agentHandle || sessions.length === 0 || chatSession) return;
    if (awaitingNewSession || newChatRequested) return;
    setChatSession(agentHandle.chatSession(sessions[0].sessionId));
  }, [sessions, chatSession, agentHandle, awaitingNewSession, newChatRequested]);

  // Polling for live updates
  useEffect(() => {
    if (!venue) return;
    const t = setInterval(() => {
      refreshAgentList();
      refreshAgentDetail(selectedAgentId);
      refreshSessions(selectedAgentId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [venue, selectedAgentId, refreshAgentList, refreshAgentDetail, refreshSessions]);

  // Auto-scroll transcript on update
  const selectedSessionId = chatSession?.sessionId ?? null;
  const currentSession = useMemo(
    () => sessions.find((s) => s.sessionId === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  // The in-flight send this transcript should echo, if any.
  const pendingChat = findPendingChat(pendingChats, selectedAgentId, selectedSessionId);
  const sending = !!pendingChat;

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [currentSession?.conversation.length, sending]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleSuspend = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle.suspend().then(() => {
      gtmEvent.suspendAgent(selectedAgentId);
      toast("Agent suspended");
      refreshAgentDetail(selectedAgentId);
      refreshAgentList();
    }).catch((err: any) => {
      gtmEvent.suspendAgentFailed(selectedAgentId, err?.message);
      toast("Unable to suspend agent");
    });
  };

  const handleResume = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle.resume().then(() => {
      gtmEvent.resumeAgent(selectedAgentId);
      toast("Agent resumed");
      refreshAgentDetail(selectedAgentId);
      refreshAgentList();
    }).catch((err: any) => {
      gtmEvent.resumeAgentFailed(selectedAgentId, err?.message);
      toast("Unable to resume agent");
    });
  };

  const handleDelete = () => {
    if (!agentHandle || !selectedAgentId) return;
    const agentId = selectedAgentId;
    agentHandle.delete().then(() => {
      gtmEvent.deleteAgent(agentId);
      toast("Agent deleted");
      setSelectedAgentId(null);
      setSelectedAgentDetail(null);
      setAgentHandle(null);
      setChatSession(null);
      refreshAgentList();
    }).catch((err: any) => {
      gtmEvent.deleteAgentFailed(agentId, err?.message);
      toast("Unable to delete agent");
    });
  };

  const handleNewChat = () => {
    setChatSession(null);
    setNewChatRequested(true);
  };

  const handleSelectSession = (sessionId: string) => {
    if (!agentHandle) return;
    setChatSession(agentHandle.chatSession(sessionId));
    setNewChatRequested(false);
  };

  const handleSend = () => {
    if (!agentHandle || !selectedAgentId || !messageText.trim()) return;
    const text = messageText.trim();
    const sendAgentId = selectedAgentId;

    // Create a new ChatSession if none exists (new chat)
    const session = chatSession ?? agentHandle.chatSession();
    const sendSessionId = session.sessionId ?? null;

    setMessageText("");
    const chat = startPendingChat({ agentId: sendAgentId, sessionId: sendSessionId, text });

    // Race the send against a timeout so a suspended/unresponsive agent
    // doesn't leave the spinner running indefinitely.
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Agent is not responding — it may be suspended. Check the status panel.")),
        SEND_TIMEOUT_MS,
      );
    });

    Promise.race([session.send(text), timeout])
      .then(async (result) => {
        clearTimeout(timeoutId);
        // An empty response is a silent failure (agent errored without a
        // reply turn) — surface it rather than showing nothing.
        const r = (result as any)?.response;
        if (r == null || (typeof r === "string" && r.trim() === "")) {
          toast("The agent sent an empty reply", {
            description: "It may have hit an error — check the Details panel.",
          });
        }
        // ChatSession auto-captures sessionId — update our state reference.
        // The requested new chat now exists, so auto-select is free again.
        setChatSession(session);
        setNewChatRequested(false);
        if (sendSessionId === null && result?.sessionId) {
          attachSessionId(chat, result.sessionId);
        }
        gtmEvent.sendAgentMessage(sendAgentId);
        await refreshSessions(sendAgentId);
        refreshAgentDetail(sendAgentId);
        refreshAgentList();
      })
      .catch((err: any) => {
        clearTimeout(timeoutId);
        gtmEvent.sendAgentMessageFailed(sendAgentId, err?.message);
        toast(`Chat failed: ${err?.message || "see console"}`);
        setMessageText(text);
      })
      .finally(() => clearPendingChat(chat));
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatSessionLabel = (s: Session) => {
    const short = s.sessionId.slice(-8);
    const when = s.created
      ? new Date(s.created).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
    return `${when} · …${short} · ${s.turns ?? 0} turn${(s.turns ?? 0) === 1 ? "" : "s"}`;
  };


  // ─── Render ─────────────────────────────────────────────────────────────────

  const canSend = !!selectedAgentDetail
    && selectedAgentDetail.status !== AgentStatus.TERMINATED
    && selectedAgentDetail.status !== AgentStatus.SUSPENDED;

  // The echo is dropped once the venue has recorded that turn and a poll has
  // brought it into view, so the transcript never shows the message twice.
  const echoAlreadyRecorded = !!pendingChat
    && (currentSession?.conversation ?? []).some(
      (m) => m.role === "user" && messageContentToString(m.content) === pendingChat.text
    );

  return (
    <>
      <TopBar />
      <div ref={containerRef} className="flex h-[calc(100vh-120px)] min-h-[600px] w-full border border-border rounded-lg overflow-hidden shadow-sm">

        {/* Column 1: Agent List */}
        <div
          data-testid="agent-list-panel"
          style={{ width: `${leftWidth}px` }}
          className="flex-shrink-0 border-r border-border overflow-y-auto"
        >
          <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agents
          </div>
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
          {agentList.map((agent) => (
            <button
              key={agent.agentId}
              onClick={() => setSelectedAgentId(agent.agentId)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-b border-border last:border-0
                ${selectedAgentId === agent.agentId ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'hover:bg-accent text-foreground'}`}
            >
              <Bot size={14} className={`flex-shrink-0 ${selectedAgentId === agent.agentId ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-base truncate">{agent.agentId}</p>
                {(agent.tasks != null || agent.status) && (
                  <div className="flex items-center gap-1.5 text-[10px] opacity-70">
                    {agent.tasks != null && <span>{agent.tasks} task{agent.tasks !== 1 ? 's' : ''}</span>}
                    {agent.tasks != null && agent.status && <span>·</span>}
                    {agent.status && <StatusBadge status={agent.status} kind="agent" as="pill" />}
                  </div>
                )}
              </div>
            </button>
          ))}
          {!loading && agentList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bot size={32} />
              <p className="text-sm mt-2">No agents found</p>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          data-testid="agent-list-divider"
          onMouseDown={startResizing}
          className="w-1.5 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
        >
          <div className="hidden group-hover:block absolute bg-blue-500 rounded-full p-0.5">
            <GripVertical size={10} className="text-white" />
          </div>
        </div>

        {/* Column 2: Chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {detailLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}

          {!detailLoading && !selectedAgentDetail && (
            // A failed load must not masquerade as "nothing selected" — the
            // user picked an agent and deserves an explicit error state.
            <div
              data-testid={detailError ? "agent-detail-error" : "agent-detail-empty"}
              className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center"
            >
              <Bot size={32} />
              <p className="text-sm mt-2">
                {detailError
                  ? `Couldn't load details for ${selectedAgentId ?? "this agent"} — see the error notification.`
                  : "Select an agent"}
              </p>
            </div>
          )}

          {!detailLoading && selectedAgentDetail && (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
                <Bot size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold font-mono text-foreground">{selectedAgentDetail.agentId}</h3>
                <StatusBadge status={selectedAgentDetail.status} kind="agent" as="pill" />
                {(selectedAgentDetail.tasks ?? 0) > 0 && (
                  <Badge variant="outline">{selectedAgentDetail.tasks} task{selectedAgentDetail.tasks === 1 ? '' : 's'}</Badge>
                )}
                <div className="ml-auto flex flex-row gap-2">
                  {(selectedAgentDetail.status === AgentStatus.RUNNING || selectedAgentDetail.status === AgentStatus.SLEEPING) && (
                    <Button variant="outline" size="sm" onClick={handleSuspend}>
                      <Pause size={14} className="mr-1" /> Suspend
                    </Button>
                  )}
                  {selectedAgentDetail.status === AgentStatus.SUSPENDED && (
                    <Button variant="outline" size="sm" onClick={handleResume}>
                      <Play size={14} className="mr-1" /> Resume
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 size={14} className="mr-1" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete agent &quot;{selectedAgentDetail.agentId}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Session toolbar */}
              <div className="px-6 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
                <MessageSquare size={16} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session</span>
                <div className="flex-1 max-w-md">
                  <Select
                    value={selectedSessionId ?? "__new__"}
                    onValueChange={(v) => {
                      if (v === "__new__") handleNewChat();
                      else handleSelectSession(v);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="New chat (no session yet)">
                        {selectedSessionId
                          ? formatSessionLabel(currentSession ?? { sessionId: selectedSessionId, conversation: [] })
                          : sessions.length === 0 ? "No sessions yet — send a message to start one" : "New chat"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__">+ New chat</SelectItem>
                      {sessions.map((s) => (
                        <SelectItem key={s.sessionId} value={s.sessionId}>
                          {formatSessionLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="new-chat" variant="outline" size="sm" onClick={handleNewChat} disabled={!chatSession}>
                  <Plus size={14} className="mr-1" /> New chat
                </Button>
              </div>

              {/* Transcript */}
              <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-3 bg-background">
                {!currentSession?.conversation.length && !pendingChat && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
                    <MessageSquare size={32} className="mb-2" />
                    {selectedSessionId
                      ? <p>This session has no messages yet.</p>
                      : <p>Send a message below to start a new chat session with {selectedAgentDetail.agentId}.</p>}
                  </div>
                )}
                {currentSession?.conversation.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const isAssistant = msg.role === "assistant";
                  // Tool/system turns render as their own collapsible bubble: the
                  // result (structuredContent for a success, an "Error:" string
                  // for a failure) is hidden behind a header until expanded.
                  if (!isUser && !isAssistant) {
                    return <AgentToolTurn key={i} role={msg.role} tool={describeToolTurn(msg)} ts={msg.ts} />;
                  }
                  // A visible per-message timestamp is clutter; keep it as a
                  // hover title instead ("Reply from <agent> at <time>").
                  const when = msg.ts ? new Date(msg.ts).toLocaleTimeString() : null;
                  const title = when
                    ? isAssistant
                      ? `Reply from ${selectedAgentId ?? "agent"} at ${when}`
                      : `Sent at ${when}`
                    : undefined;
                  return (
                    <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div title={title} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words
                        ${isUser ? "bg-blue-600 text-white" : "bg-muted text-foreground"}`}>
                        {/* Task-originated turns (agent_request) look identical to chat
                            once unwrapped — label their provenance so the transcript
                            stays an honest record. source comes from the turn itself. */}
                        {isUser && msg.source === "request" && (
                          <div data-testid="turn-source-label" className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">task</div>
                        )}
                        {messageContentToString(msg.content)}
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
                      <span className="italic text-muted-foreground">{selectedAgentDetail.agentId} is thinking…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="px-6 py-3 border-t border-border bg-muted/20 flex flex-col gap-2">
                <div className="flex flex-row gap-2">
                  <Input
                    data-testid="composer-input"
                    placeholder={canSend ? `Message ${selectedAgentDetail.agentId}…` : `${selectedAgentDetail.status} — cannot send`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="text-sm"
                    disabled={sending || !canSend}
                  />
                  <Button data-testid="composer-send" size="sm" onClick={handleSend} disabled={sending || !canSend || !messageText.trim()}>
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </Button>
                </div>
                {!canSend && selectedAgentDetail.status === AgentStatus.SUSPENDED && (
                  <p className="text-xs text-muted-foreground">Resume the agent to send messages.</p>
                )}
              </div>

              {/* Collapsible details (config / state / timeline) */}
              <div className="border-t border-border bg-background">
                <button
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="w-full px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 hover:bg-accent"
                >
                  <ChevronDown size={14} className={`transition-transform ${detailsOpen ? '' : '-rotate-90'}`} />
                  Details
                </button>
                {detailsOpen && (
                  <div className="px-6 pb-4 space-y-3 text-xs">
                    {selectedAgentDetail.config && (
                      <div>
                        <div className="font-semibold mb-1 text-foreground">Config</div>
                        <pre className="font-mono bg-muted rounded px-2 py-2 overflow-x-auto">
                          {JSON.stringify(selectedAgentDetail.config, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedAgentDetail.stateConfig && (
                      <div>
                        <div className="font-semibold mb-1 text-foreground">State Config (resolved)</div>
                        <pre className="font-mono bg-muted rounded px-2 py-2 overflow-x-auto">
                          {JSON.stringify(selectedAgentDetail.stateConfig, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedAgentDetail.timeline && selectedAgentDetail.timeline.length > 0 && (
                      <div>
                        <div className="font-semibold mb-1 text-foreground">Timeline ({selectedAgentDetail.timeline.length})</div>
                        <pre className="font-mono bg-muted rounded px-2 py-2 overflow-x-auto max-h-48">
                          {JSON.stringify(selectedAgentDetail.timeline, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AgentExplorer;
