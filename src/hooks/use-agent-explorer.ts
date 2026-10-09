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
  type ChatSession,
  type Venue,
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
import { describeSendFailure, dispatchAgentMessage } from "@/lib/agent-chat";
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

/**
 * One agent on one venue. Every per-agent slot below is filed under this key
 * and read back only while it is the current selection, so a venue or agent
 * switch shows the placeholder in the same render — nothing has to be reset —
 * and a late reply for the previous selection has nowhere visible to land.
 */
type AgentKey = string;
const agentKey = (venue: Venue, agentId: string): AgentKey => `${venue.venueId}\n${agentId}`;

type ListSlot = { venue: Venue; list: AgentListItem[] };
type DetailSlot = { key: AgentKey; detail: AgentDetail | null; error: boolean };
type SessionsSlot = { key: AgentKey; sessions: Session[] };
type ChatSlot = { key: AgentKey; session: ChatSession | null; newChatRequested: boolean };
type DraftSlot = { key: AgentKey; text: string };
/** A message whose send failed, kept in its conversation so it can be retried
 *  or taken back into the composer. `turnsAtSend` tells whether the venue had
 *  already recorded the message before failing (then only the reply is missing). */
type FailedSendSlot = {
  key: AgentKey;
  sessionId: string | null;
  text: string;
  reason: string;
  turnsAtSend: number;
};

/**
 * Whether a read may take over a slot showing another agent. Only the
 * selection effect's own load may (`replace`), and only while that selection
 * stands; a poll or a post-action refresh updates a slot only if it still
 * shows the same agent, so it can neither clobber the agent now on screen nor
 * bring back one the user has left.
 */
type Landing = { replace: () => boolean };
const UPDATE_ONLY: Landing = { replace: () => false };

const NO_AGENTS: AgentListItem[] = [];
const NO_SESSIONS: Session[] = [];

/** Latest-call-wins, per agent: a stale reply for one agent cannot cancel a
 *  newer read for another. */
function nextRequest(counters: Map<AgentKey, number>, key: AgentKey): () => boolean {
  const requestId = (counters.get(key) ?? 0) + 1;
  counters.set(key, requestId);
  return () => counters.get(key) === requestId;
}

export function useAgentExplorer(
  initialAgentId?: string,
  { pinned = false }: AgentExplorerOptions = {},
) {
  const venue = useAuthenticatedVenue();
  const auth = useCurrentAuth();
  const [listSlot, setListSlot] = useState<ListSlot | null>(null);
  // The host's or user's explicit choice; a picker falls back to the first
  // agent listed, a pinned host to none.
  const [chosenAgentId, setChosenAgentId] = useState<string | null>(
    initialAgentId ?? null,
  );
  const [detailSlot, setDetailSlot] = useState<DetailSlot | null>(null);
  const [sessionsSlot, setSessionsSlot] = useState<SessionsSlot | null>(null);
  const [chatSlot, setChatSlot] = useState<ChatSlot | null>(null);
  const [draft, setDraft] = useState<DraftSlot | null>(null);
  const [failedSlot, setFailedSlot] = useState<FailedSendSlot | null>(null);
  const [triggeringKey, setTriggeringKey] = useState<AgentKey | null>(null);
  const [forking, setForking] = useState(false);
  const listRequest = useRef(0);
  const detailRequests = useRef(new Map<AgentKey, number>());
  const sessionRequests = useRef(new Map<AgentKey, number>());

  const agentList = listSlot && listSlot.venue === venue ? listSlot.list : NO_AGENTS;
  const loading = !!venue && !pinned && listSlot?.venue !== venue;
  const selectedAgentId =
    chosenAgentId ?? (pinned ? null : agentList[0]?.agentId ?? null);
  const currentKey = venue && selectedAgentId ? agentKey(venue, selectedAgentId) : null;
  const agentHandle = useMemo(
    () => (venue && selectedAgentId ? venue.agent(selectedAgentId) : null),
    [venue, selectedAgentId],
  );
  const detail = detailSlot && detailSlot.key === currentKey ? detailSlot : null;
  const selectedAgentDetail = detail?.detail ?? null;
  const detailError = detail?.error ?? false;
  const sessions =
    sessionsSlot && sessionsSlot.key === currentKey ? sessionsSlot.sessions : NO_SESSIONS;
  // Loading until both the detail and the sessions have landed for this agent.
  const detailLoading =
    currentKey !== null && (detail === null || sessionsSlot?.key !== currentKey);
  const chat = chatSlot && chatSlot.key === currentKey ? chatSlot : null;
  // A draft is addressed to the agent it was typed for; it is never shown
  // under — so never sent to — whichever agent is selected next.
  const messageText = draft && draft.key === currentKey ? draft.text : "";
  const triggering = triggeringKey !== null && triggeringKey === currentKey;

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
      const stillCurrent = () => requestId === listRequest.current;
      return venue.agents
        .list(true)
        .then((result) => {
          if (stillCurrent()) setListSlot({ venue, list: normalizeAgentEntries(result.agents) });
        })
        .catch((error: unknown) => {
          if (!stillCurrent()) return;
          // A failed first read still settles `loading`; the list keeps what it had.
          setListSlot((previous) =>
            previous?.venue === venue ? previous : { venue, list: NO_AGENTS },
          );
          if (surfaceErrors) notifyError("Unable to load agents", error, venue.baseUrl);
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
    (agentId: string | null, surfaceErrors = false, landing: Landing = UPDATE_ONLY) => {
      if (!venue || !agentId) return Promise.resolve();
      const key = agentKey(venue, agentId);
      const stillCurrent = nextRequest(detailRequests.current, key);
      const publish = (slot: Omit<DetailSlot, "key">) =>
        setDetailSlot((previous) =>
          landing.replace() || previous?.key === key ? { key, ...slot } : previous,
        );
      return loadAgentDetail(agentId)
        .then((loaded) => {
          if (stillCurrent()) publish({ detail: loaded, error: false });
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
            publish({ detail: null, error: false });
            setChosenAgentId((chosen) => (chosen === agentId ? null : chosen));
            return;
          }
          if (!surfaceErrors) return;
          const { reason, jobHref } = jobFailure(error, venue.venueId);
          notifyError("Unable to load agent details", reason, venue.baseUrl, jobHref);
          publish({ detail: null, error: true });
        });
    },
    [loadAgentDetail, venue],
  );

  const refreshSessions = useCallback(
    (agentId: string | null, landing: Landing = UPDATE_ONLY) => {
      if (!venue || !agentId) return Promise.resolve();
      const key = agentKey(venue, agentId);
      const stillCurrent = nextRequest(sessionRequests.current, key);
      const publish = (list: Session[]) =>
        setSessionsSlot((previous) =>
          landing.replace() || previous?.key === key ? { key, sessions: list } : previous,
        );
      return venue.agents
        .listSessions(agentId, { offset: 0, limit: SESSION_LIMIT })
        .then((result) => {
          if (stillCurrent()) publish(agentSessionsToSessions(result?.items));
        })
        .catch(() => {
          if (stillCurrent()) publish(NO_SESSIONS);
        });
    },
    [venue],
  );

  // The agent list has no live-update path — the venue's per-agent SSE
  // stream reports one agent's run loop, not "which agents exist" — so it is
  // read once here and then polled. A pinned host never shows it.
  useEffect(() => {
    if (!venue || pinned) return;
    const requests = listRequest;
    ++requests.current;
    void refreshAgentList(true);
    const timer = setInterval(() => {
      void refreshAgentList();
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      ++requests.current;
    };
  }, [venue, pinned, refreshAgentList]);

  // The selected agent's detail and sessions. This load is the one allowed to
  // take over the slots — and only while this selection stands.
  useEffect(() => {
    if (!venue || !selectedAgentId) return;
    let active = true;
    const landing: Landing = { replace: () => active };
    void refreshAgentDetail(selectedAgentId, true, landing);
    void refreshSessions(selectedAgentId, landing);
    return () => {
      active = false;
    };
  }, [venue, selectedAgentId, refreshAgentDetail, refreshSessions]);

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

  // The conversation shown is the one the user chose or, until they choose,
  // the most recent session at the time the sessions first arrived — adopted
  // as the choice here, during render, so it then stays put when a newer
  // session appears (following the newest would yank the reader out of the
  // thread they are reading). Nothing is adopted while a new chat is being
  // started or its first message is still in flight.
  const firstSessionId = sessions[0]?.sessionId ?? null;
  if (agentHandle && currentKey && !chat && !awaitingNewSession && firstSessionId) {
    setChatSlot({
      key: currentKey,
      session: agentHandle.chatSession(firstSessionId),
      newChatRequested: false,
    });
  }
  const chatSession = chat?.session ?? null;

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

  const setMessageText = useCallback(
    (text: string) => {
      if (currentKey) setDraft({ key: currentKey, text });
    },
    [currentKey],
  );

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
        // Drop the choice if it is still this agent; its detail, sessions and
        // chat fall away with the selection.
        setChosenAgentId((chosen) => (chosen === agentId ? null : chosen));
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
    if (!agentHandle || !selectedAgentId || !currentKey || triggering) return;
    const agentId = selectedAgentId;
    const key = currentKey;
    setTriggeringKey(key);
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
        setTriggeringKey((previous) => (previous === key ? null : previous));
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
      if (!pinned) setChosenAgentId(result.agentId);
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
      if (!venue || !agentHandle || !selectedAgentId || !selectedAgentDetail) return { status: "failed" };
      const agentId = selectedAgentId;
      const key = agentKey(venue, agentId);

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
        notifyError("Unable to verify agent settings before saving", error, venue.baseUrl);
        return { status: "failed" };
      }
      const freshConfig = fresh.config ?? {};
      const conflicted = Object.keys(config).some(
        (key) => !agentConfigsEqual(freshConfig[key], baseline[key]),
      );
      if (conflicted) {
        setDetailSlot((previous) =>
          previous?.key === key ? { key, detail: fresh, error: false } : previous,
        );
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
              venue.baseUrl,
            );
          }
        }
        const { reason, jobHref } = jobFailure(error, venue.venueId);
        notifyError("Unable to update agent settings", reason, venue.baseUrl, jobHref);
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
            venue.baseUrl,
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
    if (!currentKey) return;
    setChatSlot({ key: currentKey, session: null, newChatRequested: true });
  };

  const selectSession = (sessionId: string) => {
    if (!agentHandle || !currentKey) return;
    setChatSlot({ key: currentKey, session: agentHandle.chatSession(sessionId), newChatRequested: false });
  };

  // Sends `text` to the conversation on screen (or a new one). Shared by the
  // composer and by retrying a failed message.
  const dispatch = (text: string) => {
    if (!venue || !agentHandle || !selectedAgentId || !currentKey) return;
    const agentId = selectedAgentId;
    const key = currentKey;
    const session = chatSession ?? agentHandle.chatSession();
    const sessionId = session.sessionId ?? null;
    const turnsAtSend = currentSession?.conversation.length ?? 0;
    setFailedSlot((previous) => (previous?.key === key ? null : previous));
    const chat = startPendingChat({
      agentId,
      sessionId,
      text,
      turnsAtSend,
    });

    void dispatchAgentMessage({
      agentId,
      text,
      venueId: venue.venueId,
      venueBaseUrl: venue.baseUrl,
      send: (message) => session.send(message),
      agentStatus: () => venue.agents.info(agentId).then((info) => info.status),
    })
      .then(async (result) => {
        // The conversation this message went to becomes the one shown — for
        // this agent. Another agent's chat, if the user has moved on, is left
        // alone.
        setChatSlot((previous) =>
          previous && previous.key !== key ? previous : { key, session, newChatRequested: false },
        );
        if (sessionId === null && result?.sessionId) {
          attachSessionId(chat, result.sessionId);
        }
        // Refreshes land only in slots still showing this agent.
        await refreshSessions(agentId);
        void refreshAgentDetail(agentId);
        void refreshAgentList();
      })
      .catch((error: unknown) => {
        revalidateVenueOnFailure(venue, auth, error);
        // Keep the message in its conversation, marked failed, with Retry and
        // Edit — rather than silently dropping it back into the composer.
        setFailedSlot({
          key,
          sessionId: session.sessionId ?? sessionId,
          text,
          reason: describeSendFailure(error, venue.venueId),
          turnsAtSend,
        });
        // The venue may have kept the message before the turn failed; re-read
        // so the transcript shows what it actually holds.
        void refreshSessions(agentId);
      })
      .finally(() => clearPendingChat(chat));
  };

  const send = () => {
    if (!currentKey || !messageText.trim()) return;
    const text = messageText.trim();
    setDraft({ key: currentKey, text: "" });
    dispatch(text);
  };

  // The failed message for the conversation on screen, if any.
  const failed =
    failedSlot && failedSlot.key === currentKey && failedSlot.sessionId === selectedSessionId
      ? failedSlot
      : null;
  const failedSend = failed
    ? {
        text: failed.text,
        reason: failed.reason,
        // The venue recorded the message before the turn failed, so the
        // transcript already shows it and only the reply is missing.
        recorded: (currentSession?.conversation ?? [])
          .slice(failed.turnsAtSend)
          .some(
            (message) =>
              message.role === "user" &&
              messageContentToString(message.content) === failed.text,
          ),
      }
    : null;

  // Only while the agent can take messages: a failed run often leaves it
  // SUSPENDED, and the composer's own Send is disabled then too.
  const retrySend = () => {
    if (failed && !pendingChat && canSend) dispatch(failed.text);
  };

  // Takes the failed message back into the composer to change it. A newer
  // draft already there is not overwritten.
  const editFailedSend = () => {
    if (!failed || !currentKey) return;
    const key = currentKey;
    setDraft((previous) =>
      previous && previous.key === key && previous.text ? previous : { key, text: failed.text },
    );
    setFailedSlot(null);
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
    setSelectedAgentId: setChosenAgentId,
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
    failedSend,
    retrySend,
    editFailedSend,
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
