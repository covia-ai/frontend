"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AgentStatus,
  type Agent,
  type ChatSession,
} from "@covia/covia-sdk";
import type { AgentDetail, AgentListItem, Session } from "@/config/types";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import {
  findPendingChat,
  usePendingChats,
} from "@/hooks/use-pending-chats";
import { normalizeAgentEntries } from "@/lib/agent-list";
import { messageContentToString } from "@/lib/agent-turns";
import { sessionEntriesToSessions } from "@/lib/agent-sessions";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;
const SESSION_LIMIT = 50;
const SEND_TIMEOUT_MS = 30_000;

export function useAgentExplorer(initialAgentId?: string) {
  const venue = useAuthenticatedVenue();
  const [agentList, setAgentList] = useState<AgentListItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    initialAgentId ?? null,
  );
  const [selectedAgentDetail, setSelectedAgentDetail] =
    useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [agentHandle, setAgentHandle] = useState<Agent | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [newChatRequested, setNewChatRequested] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messageText, setMessageText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const sessionRequest = useRef(0);
  const venueRef = useRef(venue);
  const selectedAgentIdRef = useRef(selectedAgentId);
  venueRef.current = venue;
  selectedAgentIdRef.current = selectedAgentId;

  const pendingChats = usePendingChats((state) => state.pendingChats);
  const startPendingChat = usePendingChats((state) => state.startPendingChat);
  const attachSessionId = usePendingChats((state) => state.attachSessionId);
  const clearPendingChat = usePendingChats((state) => state.clearPendingChat);

  const awaitingNewSession =
    !!selectedAgentId &&
    pendingChats.some(
      (chat) =>
        chat.agentId === selectedAgentId && chat.sessionId === null,
    );

  const refreshAgentList = useCallback(
    (surfaceErrors = false) => {
      if (!venue) return Promise.resolve();
      const requestId = ++listRequest.current;
      return venue.agents
        .list(true)
        .then((result) => {
          if (
            requestId === listRequest.current &&
            venueRef.current === venue
          ) {
            setAgentList(normalizeAgentEntries(result.agents));
          }
        })
        .catch((error: unknown) => {
          if (
            surfaceErrors &&
            requestId === listRequest.current &&
            venueRef.current === venue
          ) {
            notifyError("Unable to load agents", error, venue.baseUrl);
          }
        });
    },
    [venue],
  );

  const loadAgentDetail = useCallback(
    (agentId: string): Promise<AgentDetail | null> => {
      if (!venue) return Promise.resolve(null);
      return Promise.all([
        venue.agents.info(agentId),
        venue.workspace
          .read(`g/${agentId}/timeline`)
          .then((result) =>
            Array.isArray(result?.value) ? result.value : [],
          )
          .catch(() => []),
      ])
        .then(
          ([info, timeline]) => ({ ...info, timeline }) as AgentDetail,
        )
        .catch(() => null);
    },
    [venue],
  );

  const refreshAgentDetail = useCallback(
    (agentId: string | null, surfaceErrors = false) => {
      if (!agentId) return Promise.resolve();
      const requestId = ++detailRequest.current;
      return loadAgentDetail(agentId).then((detail) => {
        if (
          requestId !== detailRequest.current ||
          venueRef.current !== venue ||
          selectedAgentIdRef.current !== agentId
        ) {
          return;
        }
        if (detail) {
          setSelectedAgentDetail(detail);
          setDetailError(false);
        } else if (surfaceErrors) {
          notifyError("Unable to load agent details");
          setSelectedAgentDetail(null);
          setDetailError(true);
        }
      });
    },
    [loadAgentDetail, venue],
  );

  const refreshSessions = useCallback(
    (agentId: string | null) => {
      if (!venue || !agentId) return Promise.resolve();
      const requestId = ++sessionRequest.current;
      return venue.workspace
        .slice(`g/${agentId}/sessions`, 0, SESSION_LIMIT)
        .then((result) => {
          if (
            requestId === sessionRequest.current &&
            venueRef.current === venue &&
            selectedAgentIdRef.current === agentId
          ) {
            setSessions(sessionEntriesToSessions(result?.values));
          }
        })
        .catch(() => {
          if (
            requestId === sessionRequest.current &&
            venueRef.current === venue &&
            selectedAgentIdRef.current === agentId
          ) {
            setSessions([]);
          }
        });
    },
    [venue],
  );

  useEffect(() => {
    let active = true;
    const requests = listRequest;
    ++requests.current;
    if (!venue) {
      setAgentList([]);
      setLoading(false);
      return () => {
        active = false;
        ++requests.current;
      };
    }
    setLoading(true);
    void refreshAgentList(true).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      ++requests.current;
    };
  }, [venue, refreshAgentList]);

  useEffect(() => {
    if (agentList.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agentList[0].agentId);
    }
  }, [agentList, selectedAgentId]);

  useEffect(() => {
    let active = true;
    const detailRequests = detailRequest;
    const sessionRequests = sessionRequest;
    ++detailRequests.current;
    ++sessionRequests.current;
    setChatSession(null);
    setNewChatRequested(false);
    setSessions([]);
    if (!venue || !selectedAgentId) {
      setAgentHandle(null);
      setSelectedAgentDetail(null);
      setDetailLoading(false);
      return () => {
        active = false;
        ++detailRequests.current;
        ++sessionRequests.current;
      };
    }

    const handle = venue.agent(selectedAgentId);
    setAgentHandle(handle);
    setDetailLoading(true);
    setDetailError(false);
    void Promise.all([
      refreshAgentDetail(selectedAgentId, true),
      refreshSessions(selectedAgentId),
    ]).finally(() => {
      if (active) setDetailLoading(false);
    });
    return () => {
      active = false;
      ++detailRequests.current;
      ++sessionRequests.current;
    };
  }, [
    venue,
    selectedAgentId,
    refreshAgentDetail,
    refreshSessions,
  ]);

  useEffect(() => {
    if (!agentHandle || sessions.length === 0 || chatSession) return;
    if (awaitingNewSession || newChatRequested) return;
    setChatSession(agentHandle.chatSession(sessions[0].sessionId));
  }, [
    sessions,
    chatSession,
    agentHandle,
    awaitingNewSession,
    newChatRequested,
  ]);

  useEffect(() => {
    if (!venue) return;
    const timer = setInterval(() => {
      void refreshAgentList();
      void refreshAgentDetail(selectedAgentId);
      void refreshSessions(selectedAgentId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [
    venue,
    selectedAgentId,
    refreshAgentList,
    refreshAgentDetail,
    refreshSessions,
  ]);

  const selectedSessionId = chatSession?.sessionId ?? null;
  const currentSession = useMemo(
    () =>
      sessions.find(
        (session) => session.sessionId === selectedSessionId,
      ) ?? null,
    [sessions, selectedSessionId],
  );
  const pendingChat = findPendingChat(
    pendingChats,
    selectedAgentId,
    selectedSessionId,
  );
  const sending = pendingChat !== null;

  const suspend = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle
      .suspend()
      .then(() => {
        gtmEvent.suspendAgent(selectedAgentId);
        notifySuccess("Agent suspended");
        void refreshAgentDetail(selectedAgentId);
        void refreshAgentList();
      })
      .catch((error: unknown) => {
        gtmEvent.suspendAgentFailed(
          selectedAgentId,
          error instanceof Error ? error.message : undefined,
        );
        notifyError("Unable to suspend agent", error);
      });
  };

  const resume = () => {
    if (!agentHandle || !selectedAgentId) return;
    agentHandle
      .resume()
      .then(() => {
        gtmEvent.resumeAgent(selectedAgentId);
        notifySuccess("Agent resumed");
        void refreshAgentDetail(selectedAgentId);
        void refreshAgentList();
      })
      .catch((error: unknown) => {
        gtmEvent.resumeAgentFailed(
          selectedAgentId,
          error instanceof Error ? error.message : undefined,
        );
        notifyError("Unable to resume agent", error);
      });
  };

  const deleteAgent = () => {
    if (!agentHandle || !selectedAgentId) return;
    const agentId = selectedAgentId;
    agentHandle
      .delete()
      .then(() => {
        gtmEvent.deleteAgent(agentId);
        notifySuccess("Agent deleted");
        if (selectedAgentIdRef.current === agentId) {
          setSelectedAgentId(null);
          setSelectedAgentDetail(null);
          setAgentHandle(null);
          setChatSession(null);
        }
        void refreshAgentList();
      })
      .catch((error: unknown) => {
        gtmEvent.deleteAgentFailed(
          agentId,
          error instanceof Error ? error.message : undefined,
        );
        notifyError("Unable to delete agent", error);
      });
  };

  const startNewChat = () => {
    setChatSession(null);
    setNewChatRequested(true);
  };

  const selectSession = (sessionId: string) => {
    if (!agentHandle) return;
    setChatSession(agentHandle.chatSession(sessionId));
    setNewChatRequested(false);
  };

  const send = () => {
    if (!agentHandle || !selectedAgentId || !messageText.trim()) return;
    const text = messageText.trim();
    const agentId = selectedAgentId;
    const session = chatSession ?? agentHandle.chatSession();
    const sessionId = session.sessionId ?? null;
    setMessageText("");
    const chat = startPendingChat({ agentId, sessionId, text });

    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () =>
          reject(
            new Error(
              "Agent is not responding — it may be suspended. Check the status panel.",
            ),
          ),
        SEND_TIMEOUT_MS,
      );
    });

    void Promise.race([session.send(text), timeout])
      .then(async (result) => {
        clearTimeout(timeoutId);
        const response = result?.response;
        if (
          response == null ||
          (typeof response === "string" && response.trim() === "")
        ) {
          notifyWarning("The agent sent an empty reply", {
            description:
              "It may have hit an error — check the Details panel.",
          });
        }
        const stillSelected =
          venueRef.current === venue &&
          selectedAgentIdRef.current === agentId;
        if (stillSelected) {
          setChatSession(session);
          setNewChatRequested(false);
        }
        if (sessionId === null && result?.sessionId) {
          attachSessionId(chat, result.sessionId);
        }
        gtmEvent.sendAgentMessage(agentId);
        if (stillSelected) {
          await refreshSessions(agentId);
          void refreshAgentDetail(agentId);
          void refreshAgentList();
        }
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        const message =
          error instanceof Error ? error.message : "see console";
        gtmEvent.sendAgentMessageFailed(agentId, message);
        notifyError("Unable to send message", error);
        if (
          venueRef.current === venue &&
          selectedAgentIdRef.current === agentId
        ) {
          setMessageText(text);
        }
      })
      .finally(() => clearPendingChat(chat));
  };

  const canSend =
    !!selectedAgentDetail &&
    selectedAgentDetail.status !== AgentStatus.TERMINATED &&
    selectedAgentDetail.status !== AgentStatus.SUSPENDED;
  const echoAlreadyRecorded =
    !!pendingChat &&
    (currentSession?.conversation ?? []).some(
      (message) =>
        message.role === "user" &&
        messageContentToString(message.content) === pendingChat.text,
    );

  return {
    agentList,
    selectedAgentId,
    setSelectedAgentId,
    selectedAgentDetail,
    loading,
    detailLoading,
    detailError,
    sessions,
    hasChatSession: chatSession !== null,
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
  };
}

export type AgentExplorerController = ReturnType<typeof useAgentExplorer>;
