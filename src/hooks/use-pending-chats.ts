import { create } from "zustand";

// Chats that have been dispatched but not yet answered, so any screen showing
// a transcript can echo the user's own message and a "thinking" indicator
// while the agent works.
//
// This lives outside the components because a send and its transcript are not
// always the same screen: the home prompt fires a chat and immediately routes
// to the agent explorer, and a user can navigate away from a transcript and
// back mid-send. Component-local state loses the message in both cases.
//
// Deliberately not persisted — an in-flight send dies with the page, and
// resurrecting one after a reload would show a spinner for a reply that is
// never coming.
export type PendingChat = {
  // Stable identity: the session id is filled in later, so callers need
  // something that survives that update to clear the right record.
  id: number;
  agentId: string;
  // Null until the venue mints one server-side, which it only does once the
  // send lands. A null-session chat is echoed on whichever session of that
  // agent is in view, since the one it belongs to does not exist yet.
  sessionId: string | null;
  text: string;
};

type PendingChatsStore = {
  pendingChats: PendingChat[];
  // Returns the stored record; pass it back to attach/clear so a slow send
  // settling after later ones cannot disturb them.
  startPendingChat: (chat: Omit<PendingChat, "id">) => PendingChat;
  attachSessionId: (chat: PendingChat, sessionId: string) => void;
  clearPendingChat: (chat: PendingChat) => void;
};

let nextPendingChatId = 1;

export const usePendingChats = create<PendingChatsStore>((set) => ({
  pendingChats: [],

  startPendingChat: (chat) => {
    const record = { ...chat, id: nextPendingChatId++ };
    set((state) => ({ pendingChats: [...state.pendingChats, record] }));
    return record;
  },

  attachSessionId: (chat, sessionId) =>
    set((state) => ({
      pendingChats: state.pendingChats.map((c) =>
        c.id === chat.id ? { ...c, sessionId } : c
      ),
    })),

  clearPendingChat: (chat) =>
    set((state) => ({
      pendingChats: state.pendingChats.filter((c) => c.id !== chat.id),
    })),
}));

// The chat to echo on a given transcript: same agent, and either bound to the
// session in view or not yet bound to any.
export function findPendingChat(
  pendingChats: PendingChat[],
  agentId: string | null,
  sessionId: string | null
): PendingChat | null {
  if (!agentId) return null;
  return pendingChats.find(
    (c) => c.agentId === agentId && (c.sessionId === null || c.sessionId === sessionId)
  ) ?? null;
}
