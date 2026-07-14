"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  GripVertical, Bot, Pause, Play, Trash2, Send, Loader2,
  Plus, MessageSquare, ChevronDown
} from 'lucide-react';
import { AgentDetail, AgentListItem, Session, SessionMessage } from '@/config/types';
import { TopBar } from './admin-panel/TopBar';
import { Agent, ChatSession, AgentStatus } from '@covia/covia-sdk';
import { useAuthenticatedVenue } from '@/hooks/use-authenticated-venue';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

  // Agent handle + chat session (OO API from SDK 1.5.0)
  const [agentHandle, setAgentHandle] = useState<Agent | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);

  // Sessions + chat
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<
    { agentId: string; sessionId: string | null; text: string } | null
  >(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Layout
  const [leftWidth, setLeftWidth] = useState(200);
  const isResizingLeft = useRef(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const refreshAgentList = () => {
    if (!venue) return Promise.resolve();
    return venue.agents.list(true).then((result) => {
      setAgentList(result.agents || []);
    }).catch(() => {});
  };

  // Agent detail = lightweight info() + the timeline the Details panel dumps.
  // Replaces the removed agents.query(), which bundled info plus timeline/state/
  // inbox reads (4 jobs); we only render info-fields + timeline, so state/inbox
  // are dropped. info() and the timeline read are job-free on venues that serve
  // the values API; on older ones they fall back to invoke via the SDK.
  const loadAgentDetail = (agentId: string): Promise<AgentDetail | null> => {
    if (!venue) return Promise.resolve(null);
    return Promise.all([
      venue.agents.info(agentId),
      venue.workspace.read(`g/${agentId}/timeline`)
        .then((r) => (Array.isArray(r?.value) ? r.value : []))
        .catch(() => []),
    ])
      .then(([info, timeline]) => ({ ...info, timeline } as AgentDetail))
      .catch(() => null);
  };

  const refreshAgentDetail = (agentId: string | null) => {
    if (!agentId) return Promise.resolve();
    return loadAgentDetail(agentId).then((detail) => {
      if (detail) setSelectedAgentDetail(detail);
    });
  };

  const refreshSessions = (agentId: string | null) => {
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
  };

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Initial agent list load
  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    refreshAgentList().finally(() => setLoading(false));
  }, [venue]);

  // Auto-select first agent when list arrives
  useEffect(() => {
    if (agentList.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agentList[0].agentId);
    }
  }, [agentList, selectedAgentId]);

  // Reload detail + sessions when agent changes
  useEffect(() => {
    setChatSession(null);
    setSessions([]);
    if (!venue || !selectedAgentId) {
      setAgentHandle(null);
      setSelectedAgentDetail(null);
      return;
    }
    const handle = venue.agent(selectedAgentId);
    setAgentHandle(handle);
    setDetailLoading(true);
    Promise.all([
      loadAgentDetail(selectedAgentId)
        .then((detail) => {
          if (detail) setSelectedAgentDetail(detail);
          else {
            toast("Unable to load agent details");
            setSelectedAgentDetail(null);
          }
        }),
      refreshSessions(selectedAgentId),
    ]).finally(() => setDetailLoading(false));
  }, [venue, selectedAgentId]);

  // Auto-select most recent session (skip while a send is in flight to avoid
  // the pending-message race: the server creates the session immediately when
  // agent:chat arrives, so the first poll would set chatSession and change
  // selectedSessionId before pendingUserMessage.sessionId is updated, causing
  // the pending bubble and spinner to vanish mid-send).
  useEffect(() => {
    if (sending) return;
    if (!chatSession && sessions.length > 0 && agentHandle) {
      setChatSession(agentHandle.chatSession(sessions[0].sessionId));
    }
  }, [sessions, chatSession, agentHandle, sending]);

  // Polling for live updates
  useEffect(() => {
    if (!venue) return;
    const t = setInterval(() => {
      refreshAgentList();
      refreshAgentDetail(selectedAgentId);
      refreshSessions(selectedAgentId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [venue, selectedAgentId]);

  // Auto-scroll transcript on update
  const selectedSessionId = chatSession?.sessionId ?? null;
  const currentSession = useMemo(
    () => sessions.find((s) => s.sessionId === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [currentSession?.conversation.length, sending]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleSuspend = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle.suspend().then(() => {
      toast("Agent suspended");
      refreshAgentDetail(selectedAgentId);
      refreshAgentList();
    }).catch(() => toast("Unable to suspend agent"));
  };

  const handleResume = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle.resume().then(() => {
      toast("Agent resumed");
      refreshAgentDetail(selectedAgentId);
      refreshAgentList();
    }).catch(() => toast("Unable to resume agent"));
  };

  const handleDelete = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle.delete().then(() => {
      toast("Agent deleted");
      setSelectedAgentId(null);
      setSelectedAgentDetail(null);
      setAgentHandle(null);
      setChatSession(null);
      refreshAgentList();
    }).catch(() => toast("Unable to delete agent"));
  };

  const handleNewChat = () => setChatSession(null);

  const handleSend = () => {
    if (!agentHandle || !selectedAgentId || !messageText.trim()) return;
    const text = messageText.trim();
    const sendAgentId = selectedAgentId;

    // Create a new ChatSession if none exists (new chat)
    const session = chatSession ?? agentHandle.chatSession();
    const sendSessionId = session.sessionId ?? null;

    setSending(true);
    setMessageText("");
    setPendingUserMessage({ agentId: sendAgentId, sessionId: sendSessionId, text });

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
        // ChatSession auto-captures sessionId — update our state reference
        setChatSession(session);
        if (sendSessionId === null && result?.sessionId) {
          setPendingUserMessage((prev) =>
            prev && prev.agentId === sendAgentId && prev.sessionId === null
              ? { ...prev, sessionId: result.sessionId }
              : prev);
        }
        await refreshSessions(sendAgentId);
        refreshAgentDetail(sendAgentId);
        refreshAgentList();
      })
      .catch((err: any) => {
        clearTimeout(timeoutId);
        toast(`Chat failed: ${err?.message || "see console"}`);
        setMessageText(text);
      })
      .finally(() => {
        setSending(false);
        setPendingUserMessage(null);
      });
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    switch (status) {
      case AgentStatus.RUNNING:    return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
      case AgentStatus.SLEEPING:   return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
      case AgentStatus.SUSPENDED:  return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300";
      case AgentStatus.TERMINATED: return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
      default:                     return "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300";
    }
  };

  const formatSessionLabel = (s: Session) => {
    const short = s.sessionId.slice(-8);
    const when = s.created
      ? new Date(s.created).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
    return `${when} · …${short} · ${s.turns ?? 0} turn${(s.turns ?? 0) === 1 ? "" : "s"}`;
  };

  const messageContentToString = (c: any): string => {
    if (c == null) return "";
    if (typeof c === "string") return c;
    if (typeof c === "object") {
      if (typeof c.text === "string") return c.text;
      if (typeof c.message === "string") return c.message;
      if (typeof c.content === "string") return c.content;
      if (typeof c.input === "string") return c.input;
    }
    return JSON.stringify(c, null, 2);
  };

  // ─── Resize ─────────────────────────────────────────────────────────────────

  const startResizingLeft = () => {
    isResizingLeft.current = true;
    document.addEventListener("mousemove", handleMouseMoveLeft);
    document.addEventListener("mouseup", stopResizingLeft);
    document.body.style.cursor = "col-resize";
  };
  const handleMouseMoveLeft = (e: MouseEvent) => {
    if (!isResizingLeft.current) return;
    const newWidth = Math.min(Math.max(200, e.clientX - 20), 600);
    setLeftWidth(newWidth);
  };
  const stopResizingLeft = () => {
    isResizingLeft.current = false;
    document.removeEventListener("mousemove", handleMouseMoveLeft);
    document.removeEventListener("mouseup", stopResizingLeft);
    document.body.style.cursor = "default";
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const canSend = !!selectedAgentDetail
    && selectedAgentDetail.status !== AgentStatus.TERMINATED
    && selectedAgentDetail.status !== AgentStatus.SUSPENDED;

  return (
    <>
      <TopBar />
      <div className="flex h-[calc(100vh-120px)] min-h-[600px] w-full border border-border rounded-lg overflow-hidden shadow-sm select-none">

        {/* Column 1: Agent List */}
        <div
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
                <div className="flex items-center gap-1.5 text-[10px] opacity-70">
                  <span>{agent.tasks} task{agent.tasks !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span className={`px-1.5 py-px rounded-full font-semibold ${getStatusBadge(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
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
          onMouseDown={startResizingLeft}
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
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Bot size={32} />
              <p className="text-sm mt-2">Select an agent</p>
            </div>
          )}

          {!detailLoading && selectedAgentDetail && (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
                <Bot size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-foreground">{selectedAgentDetail.agentId}</h3>
                <Badge className={getStatusBadge(selectedAgentDetail.status)}>
                  {selectedAgentDetail.status}
                </Badge>
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
                      if (v === "__new__") {
                        setChatSession(null);
                      } else if (agentHandle) {
                        setChatSession(agentHandle.chatSession(v));
                      }
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
                <Button variant="outline" size="sm" onClick={handleNewChat} disabled={!chatSession}>
                  <Plus size={14} className="mr-1" /> New chat
                </Button>
              </div>

              {/* Transcript */}
              <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-3 bg-background">
                {!currentSession?.conversation.length && (
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
                  return (
                    <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words
                        ${isUser ? "bg-blue-600 text-white" : isAssistant ? "bg-muted text-foreground" : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200"}`}>
                        {!isUser && !isAssistant && (
                          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">{msg.role}</div>
                        )}
                        {messageContentToString(msg.content)}
                        {msg.ts && (
                          <div className={`text-[10px] mt-1 ${isUser ? "text-blue-100" : "text-muted-foreground"}`}>
                            {new Date(msg.ts).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pendingUserMessage
                  && pendingUserMessage.agentId === selectedAgentId
                  && pendingUserMessage.sessionId === selectedSessionId && (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words bg-blue-600 text-white">
                        {pendingUserMessage.text}
                      </div>
                    </div>
                    {sending && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="italic text-muted-foreground">{selectedAgentDetail.agentId} is thinking…</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="px-6 py-3 border-t border-border bg-muted/20 flex flex-col gap-2">
                <div className="flex flex-row gap-2">
                  <Input
                    placeholder={canSend ? `Message ${selectedAgentDetail.agentId}…` : `${selectedAgentDetail.status} — cannot send`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="text-sm"
                    disabled={sending || !canSend}
                  />
                  <Button size="sm" onClick={handleSend} disabled={sending || !canSend || !messageText.trim()}>
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
