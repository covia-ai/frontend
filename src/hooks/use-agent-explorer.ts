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
  NotFoundError,
  type Agent,
  type ChatSession,
} from "@covia/covia-sdk";
import type { AgentDetail, AgentListItem, Session } from "@/config/types";
import { useCurrentAuth } from "@/hooks/use-auth";
import { revalidateVenueOnFailure, useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import {
  findPendingChat,
  usePendingChats,
} from "@/hooks/use-pending-chats";
import { normalizeAgentEntries } from "@/lib/agent-list";
import { messageContentToString } from "@/lib/agent-turns";
import { agentSessionsToSessions } from "@/lib/agent-sessions";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { agentConfigsEqual, type AgentConfigSaveOutcome } from "@/lib/agent-settings";
import { gtmEvent } from "@/lib/utils";
import { dispatchAgentMessage } from "@/lib/agent-chat";
import { useAgentForkProvenance } from "@/hooks/use-agent-fork-provenance";
import { useAgentLiveEvents } from "@/hooks/use-agent-live-events";

const POLL_INTERVAL_MS = 3000;
const SESSION_LIMIT = 50;

type AgentExplorerOptions = {
  /**
   * The host is addressed to exactly one agent (the profile page) and has no
   * picker to fall back to: a missing agent stays missing rather than being
   * swapped for the first one on the venue, and the agent list — which such a
   * host never shows — is neither fetched nor polled.
   */
  pinned?: boolean;
};

export function useAgentExplorer(
  initialAgentId?: string,
  { pinned = false }: AgentExplorerOptions = {},
) {
  const venue = useAuthenticatedVenue();
  const auth = useCurrentAuth();
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
  const [triggering, setTriggering] = useState(false);
  const [forking, setForking] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const sessionRequest = useRef(0);
  const venueRef = useRef(venue);
  const selectedAgentIdRef = useRef(selectedAgentId);
  venueRef.current = venue;
  selectedAgentIdRef.current = selectedAgentId;

  const { live, detailVersion, activity } = useAgentLiveEvents(venue, selectedAgentId);

  const pendingChats = usePendingChats((state) => state.pendingChats);
  const startPendingChat = usePendingChats((state) => state.startPendingChat);
  const attachSessionId = usePendingChats((state) => state.attachSessionId);
  const clearPendingChat = usePendingChats((state) => state.clearPendingChat);
  const recordForkProvenance = useAgentForkProvenance((state) => state.record);

  const awaitingNewSession =
    !!selectedAgentId &&
    pendingChats.some(
      (chat) =>
        chat.agentId === selectedAgentId && chat.sessionId === null,
    );

  const refreshAgentList = useCallback(
    (surfaceErrors = false) => {
      if (!venue || pinned) return Promise.resolve();
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
    [venue, pinned],
  );

  const loadAgentDetail = useCallback(
    (agentId: string): Promise<AgentDetail> => {
      if (!venue) return Promise.reject(new Error("No venue connected"));
      return Promise.all([
        venue.agents.info(agentId),
        venue.workspace
          .read(`g/${agentId}/timeline`)
          .then((result) =>
            Array.isArray(result?.value) ? result.value : [],
          )
          .catch(() => []),
      ]).then(
        ([info, timeline]) => ({ ...info, timeline }) as AgentDetail,
      );
    },
    [venue],
  );

  const refreshAgentDetail = useCallback(
    (agentId: string | null, surfaceErrors = false) => {
      if (!agentId) return Promise.resolve();
      const requestId = ++detailRequest.current;
      const stillCurrent = () =>
        requestId === detailRequest.current &&
        venueRef.current === venue &&
        selectedAgentIdRef.current === agentId;
      return loadAgentDetail(agentId)
        .then((detail) => {
          if (!stillCurrent()) return;
          setSelectedAgentDetail(detail);
          setDetailError(false);
        })
        .catch((error: unknown) => {
          if (!stillCurrent()) return;
          if (error instanceof NotFoundError) {
            // This agentId doesn't exist on the currently connected venue —
            // most commonly because the venue was switched while this agent
            // was open (every agent belongs to one venue's own lattice).
            // That's not a failure to report; just drop the selection. A
            // picker host then auto-selects whatever the new venue actually
            // has, and a pinned host shows its not-found state.
            setSelectedAgentId(null);
            setSelectedAgentDetail(null);
            setAgentHandle(null);
            return;
          }
          if (!surfaceErrors) return;
          const { reason, jobHref } = jobFailure(error, venue?.venueId);
          notifyError("Unable to load agent details", reason, venue?.baseUrl, jobHref);
          setSelectedAgentDetail(null);
          setDetailError(true);
        });
    },
    [loadAgentDetail, venue],
  );

  const refreshSessions = useCallback(
    (agentId: string | null) => {
      if (!venue || !agentId) return Promise.resolve();
      const requestId = ++sessionRequest.current;
      return venue.agents
        .listSessions(agentId, { offset: 0, limit: SESSION_LIMIT })
        .then((result) => {
          if (
            requestId === sessionRequest.current &&
            venueRef.current === venue &&
            selectedAgentIdRef.current === agentId
          ) {
            setSessions(agentSessionsToSessions(result?.items));
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
    if (!pinned && agentList.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agentList[0].agentId);
    }
  }, [pinned, agentList, selectedAgentId]);

  useEffect(() => {
    let active = true;
    const detailRequests = detailRequest;
    const sessionRequests = sessionRequest;
    ++detailRequests.current;
    ++sessionRequests.current;
    setChatSession(null);
    setNewChatRequested(false);
    setSessions([]);
    // A draft is addressed to the agent it was typed for; carrying it over
    // would let it be sent to whichever agent is selected next.
    setMessageText("");
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

  // The agent list has no live-update path — the venue's per-agent SSE
  // stream reports one agent's run loop, not "which agents exist" — so it
  // always polls.
  useEffect(() => {
    if (!venue || pinned) return;
    const timer = setInterval(() => {
      void refreshAgentList();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [venue, pinned, refreshAgentList]);

  // The selected agent's detail + sessions poll only as a fallback for
  // venues/connections where the live event stream isn't working; once
  // `live` is true, the effect below reacts to event boundaries instead.
  useEffect(() => {
    if (!venue || live) return;
    const timer = setInterval(() => {
      void refreshAgentDetail(selectedAgentId);
      void refreshSessions(selectedAgentId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [venue, selectedAgentId, live, refreshAgentDetail, refreshSessions]);

  useEffect(() => {
    if (!venue || !selectedAgentId || detailVersion === 0) return;
    void refreshAgentDetail(selectedAgentId);
    void refreshSessions(selectedAgentId);
  }, [detailVersion, venue, selectedAgentId, refreshAgentDetail, refreshSessions]);

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
        const { reason, jobHref } = jobFailure(error, venue?.venueId);
        notifyError("Unable to suspend agent", reason, undefined, jobHref);
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
        const { reason, jobHref } = jobFailure(error, venue?.venueId);
        notifyError("Unable to resume agent", reason, undefined, jobHref);
      });
  };

  const deleteAgent = (remove: boolean) => {
    if (!agentHandle || !selectedAgentId) return;
    const agentId = selectedAgentId;
    agentHandle
      .delete(remove)
      .then(() => {
        gtmEvent.deleteAgent(agentId, remove);
        notifySuccess(remove ? "Agent removed" : "Agent terminated");
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
          remove,
          error instanceof Error ? error.message : undefined,
        );
        const { reason, jobHref } = jobFailure(error, venue?.venueId);
        notifyError(
          remove ? "Unable to remove agent" : "Unable to terminate agent",
          reason,
          undefined,
          jobHref,
        );
      });
  };

  const triggerAgent = () => {
    if (!agentHandle || !selectedAgentId || triggering) return;
    const agentId = selectedAgentId;
    setTriggering(true);
    agentHandle
      .trigger()
      .then(() => {
        notifySuccess("Agent triggered");
        void refreshAgentDetail(agentId);
        void refreshAgentList();
        void refreshSessions(agentId);
      })
      .catch((error: unknown) => {
        const { reason, jobHref } = jobFailure(error, venue?.venueId);
        notifyError("Unable to trigger agent", reason, venue?.baseUrl, jobHref);
      })
      .finally(() => {
        if (selectedAgentIdRef.current === agentId) setTriggering(false);
      });
  };

  const forkAgent = async (options: {
    agentId: string;
    includeTimeline: boolean;
    config?: Record<string, unknown>;
  }): Promise<{ status: "created" | "failed"; agentId?: string }> => {
    if (!venue || !selectedAgentId || forking) return { status: "failed" };
    const sourceId = selectedAgentId;
    setForking(true);
    try {
      const result = await venue.agents.fork({
        sourceId,
        agentId: options.agentId,
        includeTimeline: options.includeTimeline,
        ...(options.config && Object.keys(options.config).length > 0
          ? { config: options.config }
          : {}),
      });
      gtmEvent.forkAgent(sourceId, result.agentId);
      recordForkProvenance(venue.venueId, result.agentId, result.forkedFrom);
      notifySuccess(`Forked "${result.agentId}" from "${result.forkedFrom}"`);
      await refreshAgentList();
      // A pinned host follows its URL, so it navigates to the fork itself.
      if (!pinned) setSelectedAgentId(result.agentId);
      return { status: "created", agentId: result.agentId };
    } catch (error) {
      gtmEvent.forkAgentFailed(sourceId, error instanceof Error ? error.message : undefined);
      const { reason, jobHref } = jobFailure(error, venue?.venueId);
      notifyError("Unable to fork agent", reason, venue?.baseUrl, jobHref);
      return { status: "failed" };
    } finally {
      setForking(false);
    }
  };

  const updateAgentConfig = useCallback(
    async (
      config: Record<string, unknown>,
      baseline: Record<string, unknown>,
    ): Promise<AgentConfigSaveOutcome> => {
      if (!agentHandle || !selectedAgentId || !selectedAgentDetail) return { status: "failed" };
      const agentId = selectedAgentId;

      // Re-fetch immediately before writing so a concurrent edit made
      // elsewhere (another tab/session) since the editor loaded is caught
      // rather than silently overwritten (#161). No version/etag exists on
      // agent config, so this is a plain fetch-and-compare — against the
      // editor's own `baseline`, because `selectedAgentDetail` follows the
      // poll and would absorb an outside edit within seconds, waving a patch
      // built on the stale values straight through. Only the keys being
      // written can lose an edit, so only they are compared.
      let fresh: AgentDetail;
      try {
        fresh = await loadAgentDetail(agentId);
      } catch (error) {
        notifyError("Unable to verify agent settings before saving", error, venue?.baseUrl);
        return { status: "failed" };
      }
      const freshConfig = fresh.config ?? {};
      const conflicted = Object.keys(config).some(
        (key) => !agentConfigsEqual(freshConfig[key], baseline[key]),
      );
      if (conflicted) {
        setSelectedAgentDetail(fresh);
        notifyWarning(
          "This agent's settings changed since you loaded this editor. The latest version is now shown — reapply your edit and save again.",
        );
        return { status: "conflict", freshConfig };
      }

      const wasRunning = selectedAgentDetail.status === AgentStatus.RUNNING;
      let suspendedForUpdate = false;

      try {
        if (wasRunning) {
          await agentHandle.suspend();
          suspendedForUpdate = true;
        }
        await agentHandle.update({ config });
      } catch (error) {
        if (suspendedForUpdate) {
          try {
            await agentHandle.resume();
          } catch (resumeError) {
            notifyError(
              "Unable to restore agent after settings update",
              resumeError,
              venue?.baseUrl,
            );
          }
        }
        const { reason, jobHref } = jobFailure(error, venue?.venueId);
        notifyError("Unable to update agent settings", reason, venue?.baseUrl, jobHref);
        void refreshAgentDetail(agentId);
        void refreshAgentList();
        return { status: "failed" };
      }

      if (wasRunning) {
        try {
          await agentHandle.resume();
        } catch (error) {
          notifyError(
            "Agent settings saved, but unable to resume agent",
            error,
            venue?.baseUrl,
          );
        }
      }

      notifySuccess("Agent settings saved");
      await Promise.all([
        refreshAgentDetail(agentId),
        refreshAgentList(),
      ]);
      return { status: "saved" };
    },
    [
      agentHandle,
      selectedAgentDetail,
      selectedAgentId,
      venue,
      loadAgentDetail,
      refreshAgentDetail,
      refreshAgentList,
    ],
  );

  const renameSession = (agentId: string, sessionId: string, title: string) => {
    if (!venue) return;
    venue.agents
      .renameSession(agentId, sessionId, title)
      .then(() => {
        void refreshSessions(agentId);
      })
      .catch((error: unknown) => {
        const { reason, jobHref } = jobFailure(error, venue.venueId);
        notifyError("Unable to rename session", reason, venue.baseUrl, jobHref);
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
    const chat = startPendingChat({
      agentId,
      sessionId,
      text,
      turnsAtSend: currentSession?.conversation.length ?? 0,
    });

    void dispatchAgentMessage({
      agentId,
      text,
      venueId: venue?.venueId ?? "",
      venueBaseUrl: venue?.baseUrl,
      send: (message) => session.send(message),
      agentStatus: venue
        ? () => venue.agents.info(agentId).then((info) => info.status)
        : undefined,
    })
      .then(async (result) => {
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
        if (stillSelected) {
          await refreshSessions(agentId);
          void refreshAgentDetail(agentId);
          void refreshAgentList();
        }
      })
      .catch((error: unknown) => {
        revalidateVenueOnFailure(venue, auth, error);
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
    (currentSession?.conversation ?? [])
      .slice(pendingChat.turnsAtSend)
      .some(
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
    pendingChat,
    sending,
    activity,
    canSend,
    echoAlreadyRecorded,
    suspend,
    resume,
    triggerAgent,
    triggering,
    forkAgent,
    forking,
    deleteAgent,
    updateAgentConfig,
    renameSession,
    startNewChat,
    selectSession,
    send,
  };
}

export type AgentExplorerController = ReturnType<typeof useAgentExplorer>;
