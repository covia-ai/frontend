"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, GripVertical, Bot, Activity, Zap, ListTodo, Inbox, Clock, Pause, Play, Trash2, Send, Loader2 } from 'lucide-react';
import { Agent, AgentListItem } from '@/config/types';
import { useRouter } from 'next/navigation';
import { TopBar } from './admin-panel/TopBar';
import { AgentStatus } from '@covia/covia-sdk';
import { useAuthenticatedVenue } from '@/hooks/use-authenticated-venue';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
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

const AgentExplorer = (props: any) => {
  const [agentList, setAgentList] = useState<AgentListItem[]>([]);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<Agent | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(props.agentId || null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const router = useRouter();

  const venue = useAuthenticatedVenue();

  // Resizing State
  const [leftWidth, setLeftWidth] = useState(300);
  const isResizingLeft = useRef(false);

  // Load agent list
  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    venue.agents.list(true).then((result) => {
      setAgentList(result.agents || []);
    }).catch(() => {
      toast("Unable to load agents");
    }).finally(() => {
      setLoading(false);
    });
  }, [venue]);

  // Load agent detail when selected
  useEffect(() => {
    if (!venue || !selectedAgentId) {
      setSelectedAgentDetail(null);
      return;
    }
    setDetailLoading(true);
    venue.agents.query(selectedAgentId).then((result) => {
      setSelectedAgentDetail(result as Agent);
    }).catch(() => {
      toast("Unable to load agent details");
      setSelectedAgentDetail(null);
    }).finally(() => {
      setDetailLoading(false);
    });
  }, [venue, selectedAgentId]);

  // Auto-select first agent
  useEffect(() => {
    if (agentList.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agentList[0].agentId);
    }
  }, [agentList, selectedAgentId]);

  const refreshAgentDetail = () => {
    if (!venue || !selectedAgentId) return;
    venue.agents.query(selectedAgentId).then((result) => {
      setSelectedAgentDetail(result as Agent);
    }).catch(() => {});
  };

  const handleSuspend = () => {
    if (!venue || !selectedAgentId) return;
    venue.agents.suspend(selectedAgentId).then(() => {
      toast("Agent suspended");
      refreshAgentDetail();
    }).catch(() => {
      toast("Unable to suspend agent");
    });
  };

  const handleResume = () => {
    if (!venue || !selectedAgentId) return;
    venue.agents.resume(selectedAgentId).then(() => {
      toast("Agent resumed");
      refreshAgentDetail();
    }).catch(() => {
      toast("Unable to resume agent");
    });
  };

  const handleDelete = () => {
    if (!venue || !selectedAgentId) return;
    venue.agents.delete(selectedAgentId).then(() => {
      toast("Agent deleted");
      setSelectedAgentId(null);
      setSelectedAgentDetail(null);
      // Refresh list
      venue.agents.list(true).then((result) => {
        setAgentList(result.agents || []);
      });
    }).catch(() => {
      toast("Unable to delete agent");
    });
  };

  const handleSendMessage = () => {
    if (!venue || !selectedAgentId || !messageText.trim()) return;
    let message: any;
    try {
      message = JSON.parse(messageText);
    } catch {
      message = messageText;
    }
    venue.agents.message(selectedAgentId, message).then((result) => {
      toast(result.delivered ? "Message delivered" : "Message queued");
      setMessageText("");
      refreshAgentDetail();
    }).catch(() => {
      toast("Unable to send message");
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case AgentStatus.RUNNING:
        return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
      case AgentStatus.SLEEPING:
        return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
      case AgentStatus.SUSPENDED:
        return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300";
      case AgentStatus.TERMINATED:
        return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300";
    }
  };

  // Resize handlers
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

  return (
    <>
      <TopBar />
      <div className="flex h-[600px] w-full border border-border rounded-lg overflow-hidden shadow-sm select-none">

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
              className={`w-full flex items-center justify-between p-4 text-left transition-colors border-b border-border last:border-0
                ${selectedAgentId === agent.agentId ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'hover:bg-accent text-foreground'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Bot size={16} className={selectedAgentId === agent.agentId ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'} />
                <div className="truncate">
                  <p className="font-medium text-sm truncate">{agent.agentId}</p>
                  <p className="text-xs opacity-70">{agent.tasks} task{agent.tasks !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusBadge(agent.status)}`}>
                  {agent.status}
                </span>
                <ChevronRight size={16} className="flex-shrink-0" />
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

        {/* Column 2: Agent Detail */}
        <div className="flex-1 overflow-y-auto">
          {detailLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}

          {!detailLoading && selectedAgentDetail && (
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Bot size={24} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xl font-bold text-foreground">{selectedAgentDetail.agentId}</h3>
                </div>
                <Badge className={getStatusBadge(selectedAgentDetail.status)}>
                  {selectedAgentDetail.status}
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row gap-2 mb-6">
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

              <div className="space-y-4">
                {/* Status */}
                <div className="bg-muted rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-green-600" />
                      <span className="font-semibold text-sm text-foreground">Status</span>
                    </div>
                    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${getStatusBadge(selectedAgentDetail.status)}`}>
                      {selectedAgentDetail.status}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                {selectedAgentDetail.tasks && selectedAgentDetail.tasks.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <ListTodo size={18} className="text-amber-600" />
                      <span className="font-semibold text-sm text-foreground">Tasks ({selectedAgentDetail.tasks.length})</span>
                    </div>
                    <div className="space-y-1 ml-6">
                      {selectedAgentDetail.tasks.map((task: any, i: number) => (
                        <div key={i} className="text-xs text-card-foreground font-mono bg-background rounded px-2 py-1">
                          {typeof task === 'object' ? JSON.stringify(task) : String(task)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inbox */}
                {selectedAgentDetail.inbox && selectedAgentDetail.inbox.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Inbox size={18} className="text-purple-600" />
                      <span className="font-semibold text-sm text-foreground">Inbox ({selectedAgentDetail.inbox.length})</span>
                    </div>
                    <div className="space-y-1 ml-6">
                      {selectedAgentDetail.inbox.map((msg: any, i: number) => (
                        <div key={i} className="text-xs text-card-foreground font-mono bg-background rounded px-2 py-1">
                          {typeof msg === 'object' ? JSON.stringify(msg) : String(msg)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Config */}
                {selectedAgentDetail.config && Object.keys(selectedAgentDetail.config).length > 0 && (
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={18} className="text-blue-600" />
                      <span className="font-semibold text-sm text-foreground">Config</span>
                    </div>
                    <pre className="text-xs text-card-foreground font-mono bg-background rounded px-2 py-2 ml-6 overflow-x-auto">
                      {JSON.stringify(selectedAgentDetail.config, null, 2)}
                    </pre>
                  </div>
                )}

                {/* State */}
                {selectedAgentDetail.state && Object.keys(selectedAgentDetail.state).length > 0 && (
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={18} className="text-teal-600" />
                      <span className="font-semibold text-sm text-foreground">State</span>
                    </div>
                    <pre className="text-xs text-card-foreground font-mono bg-background rounded px-2 py-2 ml-6 overflow-x-auto">
                      {JSON.stringify(selectedAgentDetail.state, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Timeline */}
                {selectedAgentDetail.timeline && selectedAgentDetail.timeline.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={18} className="text-indigo-600" />
                      <span className="font-semibold text-sm text-foreground">Timeline ({selectedAgentDetail.timeline.length})</span>
                    </div>
                    <div className="space-y-1 ml-6">
                      {selectedAgentDetail.timeline.map((entry: any, i: number) => (
                        <div key={i} className="text-xs text-card-foreground font-mono bg-background rounded px-2 py-1">
                          {typeof entry === 'object' ? JSON.stringify(entry) : String(entry)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                {selectedAgentDetail.status !== AgentStatus.TERMINATED && (
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Send size={18} className="text-primary" />
                      <span className="font-semibold text-sm text-foreground">Send Message</span>
                    </div>
                    <div className="flex flex-row gap-2 ml-6">
                      <Input
                        placeholder="Message (text or JSON)"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={handleSendMessage} disabled={!messageText.trim()}>
                        <Send size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!detailLoading && !selectedAgentDetail && !selectedAgentId && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Bot size={32} />
              <p className="text-sm mt-2">Select an agent</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AgentExplorer;
