import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePendingChats } from '@/hooks/use-pending-chats';

jest.mock('@/components/admin-panel/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

const mockVenue: any = {
  venueId: 'venue-1',
  agents: {
    list: jest.fn(),
    info: jest.fn(),
  },
  agent: jest.fn(),
  workspace: {
    read: jest.fn(),
    slice: jest.fn(),
  },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import AgentExplorer from '@/components/AgentExplorer';

// The explorer renders after the app sidebar + page padding, so its container
// does NOT start at viewport x=0. The old handler assumed a fixed 20px offset
// (`clientX - 20`), which made any drag balloon the list by the real offset
// (~236px with the sidebar open) and made shrinking practically impossible.
const CONTAINER_LEFT = 256;
const CONTAINER_WIDTH = 1000;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mockContainerRect(container: Element) {
  jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    left: CONTAINER_LEFT,
    width: CONTAINER_WIDTH,
    top: 0, bottom: 0, right: CONTAINER_LEFT + CONTAINER_WIDTH, height: 800,
    x: CONTAINER_LEFT, y: 0, toJSON: () => ({}),
  } as DOMRect);
}

async function renderExplorer() {
  await act(async () => {
    render(<AgentExplorer />);
  });
}

// Resize tests need no selectable agent — an empty list renders just the
// list panel and divider.
async function setup() {
  mockVenue.agents.list.mockResolvedValue({ agents: [] });
  await renderExplorer();
  await screen.findByText('No agents found');
  const panel = screen.getByTestId('agent-list-panel');
  const divider = screen.getByTestId('agent-list-divider');
  mockContainerRect(panel.parentElement!);
  return { panel, divider };
}

describe('AgentExplorer panel resize', () => {
  afterEach(() => jest.restoreAllMocks());

  it('tracks the cursor relative to the container edge, not the viewport', async () => {
    const { panel, divider } = await setup();

    // Cursor at the divider's actual on-screen position for a 200px list.
    fireEvent.mouseDown(divider);
    fireEvent.mouseMove(document, { clientX: CONTAINER_LEFT + 200 });
    // Old code: 256 + 200 - 20 = 436px (instant jump). Fixed: unchanged 200px.
    expect(panel).toHaveStyle({ width: '200px' });
  });

  it('shrinks below the old 200px floor and collapses to zero', async () => {
    const { panel, divider } = await setup();

    fireEvent.mouseDown(divider);
    fireEvent.mouseMove(document, { clientX: CONTAINER_LEFT + 100 });
    expect(panel).toHaveStyle({ width: '100px' });

    // Dragging past the container's left edge fully collapses, never negative.
    fireEvent.mouseMove(document, { clientX: CONTAINER_LEFT - 50 });
    expect(panel).toHaveStyle({ width: '0px' });
  });

  it('caps growth at 60% of the container width', async () => {
    const { panel, divider } = await setup();

    fireEvent.mouseDown(divider);
    fireEvent.mouseMove(document, { clientX: CONTAINER_LEFT + CONTAINER_WIDTH + 500 });
    expect(panel).toHaveStyle({ width: `${CONTAINER_WIDTH * 0.6}px` });
  });

  it('keeps content selectable, suppressing selection only during a drag', async () => {
    const { panel, divider } = await setup();

    // No blanket select-none on the container — chat transcripts and agent
    // ids must be copyable.
    expect(panel.parentElement).not.toHaveClass('select-none');

    fireEvent.mouseDown(divider);
    expect(document.body.style.userSelect).toBe('none');

    fireEvent.mouseUp(document);
    expect(document.body.style.userSelect).toBe('');
    expect(document.body.style.cursor).toBe('');
  });

  it('stops tracking after mouseup', async () => {
    const { panel, divider } = await setup();

    fireEvent.mouseDown(divider);
    fireEvent.mouseMove(document, { clientX: CONTAINER_LEFT + 300 });
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: CONTAINER_LEFT + 500 });
    expect(panel).toHaveStyle({ width: '300px' });
  });
});

// Renders one agent with one session holding the given conversation turns.
async function setupWithSession(conversation: any[]) {
  const agent = { agentId: 'agent-1', status: 'RUNNING', tasks: 0 };
  mockVenue.agents.list.mockResolvedValue({ agents: [agent] });
  mockVenue.agents.info.mockResolvedValue(agent);
  mockVenue.workspace.read.mockResolvedValue({ value: [] });
  mockVenue.workspace.slice.mockResolvedValue({
    values: [{
      key: 'sess-1',
      value: {
        meta: { created: 1000, turns: conversation.length },
        pending: [],
        frames: [{ conversation }],
      },
    }],
  });
  mockVenue.agent.mockReturnValue({ chatSession: (sid?: string) => ({ sessionId: sid }) });
  await renderExplorer();
}

describe('AgentExplorer with lean GET agent entries', () => {
  it('selects and loads detail when the list is bare id strings', async () => {
    // The job-free GET /api/v1/agents returns ["opus"], not objects —
    // regression: .agentId of a string is undefined, which broke selection
    // ("Select an agent" forever) and navigation (?agentId=undefined).
    mockVenue.agents.list.mockResolvedValue({ agents: ['agent-1'] });
    mockVenue.agents.info.mockResolvedValue({ agentId: 'agent-1', status: 'SLEEPING', tasks: 0 });
    mockVenue.workspace.read.mockResolvedValue({ value: [] });
    mockVenue.workspace.slice.mockResolvedValue({ values: [] });
    mockVenue.agent.mockReturnValue({ chatSession: (sid?: string) => ({ sessionId: sid }) });
    await renderExplorer();

    // Auto-selects the first agent and loads its detail — the panel must
    // show agent info, not the "select an agent" placeholder.
    expect(await screen.findAllByText('agent-1')).not.toHaveLength(0);
    await waitFor(() => expect(mockVenue.agents.info).toHaveBeenCalledWith('agent-1'));
    expect(screen.queryByTestId('agent-detail-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-detail-error')).not.toBeInTheDocument();
  });

  it('shows an explicit error state when detail loading fails', async () => {
    mockVenue.agents.list.mockResolvedValue({ agents: ['agent-1'] });
    mockVenue.agents.info.mockRejectedValue(new Error('boom'));
    mockVenue.workspace.read.mockResolvedValue({ value: [] });
    mockVenue.workspace.slice.mockResolvedValue({ values: [] });
    mockVenue.agent.mockReturnValue({ chatSession: (sid?: string) => ({ sessionId: sid }) });
    await renderExplorer();

    expect(await screen.findByTestId('agent-detail-error')).toBeInTheDocument();
  });

  it('ignores a slow detail response after another agent is selected', async () => {
    const firstDetail = deferred<any>();
    const secondDetail = deferred<any>();
    mockVenue.agents.list.mockResolvedValue({
      agents: [
        { agentId: 'agent-1', status: 'RUNNING', tasks: 0 },
        { agentId: 'agent-2', status: 'RUNNING', tasks: 0 },
      ],
    });
    mockVenue.agents.info.mockImplementation((agentId: string) =>
      agentId === 'agent-1' ? firstDetail.promise : secondDetail.promise,
    );
    mockVenue.workspace.read.mockResolvedValue({ value: [] });
    mockVenue.workspace.slice.mockResolvedValue({ values: [] });
    mockVenue.agent.mockImplementation((agentId: string) => ({
      agentId,
      chatSession: (sessionId?: string) => ({ sessionId }),
    }));
    await renderExplorer();

    await waitFor(() =>
      expect(mockVenue.agents.info).toHaveBeenCalledWith('agent-1'),
    );
    fireEvent.click(await screen.findByRole('button', { name: /agent-2/i }));
    await waitFor(() =>
      expect(mockVenue.agents.info).toHaveBeenCalledWith('agent-2'),
    );

    await act(async () => {
      secondDetail.resolve({
        agentId: 'agent-2',
        status: 'RUNNING',
        tasks: 0,
      });
    });
    expect(
      await screen.findByRole('heading', { name: 'agent-2' }),
    ).toBeInTheDocument();

    await act(async () => {
      firstDetail.resolve({
        agentId: 'agent-1',
        status: 'RUNNING',
        tasks: 0,
      });
    });
    expect(
      screen.getByRole('heading', { name: 'agent-2' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'agent-1' }),
    ).not.toBeInTheDocument();
  });
});

// One session entry as workspace.slice returns it.
function sessionEntry(key: string, created: number, conversation: any[]) {
  return {
    key,
    value: {
      meta: { created, turns: conversation.length },
      pending: [],
      frames: [{ conversation }],
    },
  };
}

// A dispatched chat is echoed wherever its transcript is shown, whoever sent
// it: the home prompt fires venue.agents.chat() and routes straight here, so
// the explorer mounts mid-send with no send state of its own, and a user can
// navigate away from a transcript and back while an agent is still thinking.
describe('AgentExplorer with a chat in flight', () => {
  afterEach(() => {
    act(() => usePendingChats.setState({ pendingChats: [] }));
    jest.useRealTimers();
  });

  it('echoes the in-flight message with a thinking indicator', async () => {
    usePendingChats.getState().startPendingChat({ agentId: 'agent-1', sessionId: null, text: 'sent elsewhere' });
    await setupWithSession([]);

    expect(await screen.findByTestId('pending-user-message')).toHaveTextContent('sent elsewhere');
    expect(screen.getByTestId('agent-thinking')).toBeInTheDocument();
  });

  it('echoes a send bound to the session in view', async () => {
    usePendingChats.getState().startPendingChat({ agentId: 'agent-1', sessionId: 'sess-1', text: 'bound to sess-1' });
    await setupWithSession([]);

    expect(await screen.findByTestId('pending-user-message')).toHaveTextContent('bound to sess-1');
  });

  it('ignores a send bound to a different session of the same agent', async () => {
    usePendingChats.getState().startPendingChat({ agentId: 'agent-1', sessionId: 'sess-other', text: 'elsewhere' });
    await setupWithSession([]);

    await screen.findAllByText('agent-1');
    expect(screen.queryByTestId('pending-user-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-thinking')).not.toBeInTheDocument();
  });

  it('drops the echo once the venue records the turn, so it is never doubled', async () => {
    usePendingChats.getState().startPendingChat({ agentId: 'agent-1', sessionId: 'sess-1', text: 'sent elsewhere' });
    await setupWithSession([{ role: 'user', source: 'chat', content: 'sent elsewhere', ts: 1 }]);

    await screen.findByTestId('agent-thinking');
    expect(screen.queryByTestId('pending-user-message')).not.toBeInTheDocument();
    expect(screen.getAllByText('sent elsewhere')).toHaveLength(1);
  });

  it('ignores a send dispatched to a different agent', async () => {
    usePendingChats.getState().startPendingChat({ agentId: 'other-agent', sessionId: null, text: 'not for agent-1' });
    await setupWithSession([]);

    await screen.findAllByText('agent-1');
    expect(screen.queryByTestId('pending-user-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-thinking')).not.toBeInTheDocument();
  });

  // Same mechanism, local origin: the composer publishes to the shared store
  // rather than keeping its own copy of the in-flight message.
  it('echoes a message sent from the composer, and blocks a second send', async () => {
    const agent = { agentId: 'agent-1', status: 'RUNNING', tasks: 0 };
    mockVenue.agents.list.mockResolvedValue({ agents: [agent] });
    mockVenue.agents.info.mockResolvedValue(agent);
    mockVenue.workspace.read.mockResolvedValue({ value: [] });
    mockVenue.workspace.slice.mockResolvedValue({ values: [sessionEntry('sess-1', 1000, [])] });
    // A send that never settles — the agent is still thinking.
    mockVenue.agent.mockReturnValue({
      chatSession: (sid?: string) => ({ sessionId: sid, send: () => new Promise(() => {}) }),
    });
    await renderExplorer();

    const input = await screen.findByTestId('composer-input');
    fireEvent.change(input, { target: { value: 'typed here' } });
    fireEvent.click(screen.getByTestId('composer-send'));

    expect(await screen.findByTestId('pending-user-message')).toHaveTextContent('typed here');
    expect(screen.getByTestId('agent-thinking')).toBeInTheDocument();
    expect(screen.getByTestId('composer-send')).toBeDisabled();
    expect(input).toBeDisabled();
  });

  // The venue mints the session server-side, so it does not exist while the
  // send is in flight. Falling back to the newest session that does exist would
  // stack the pending message on top of an unrelated conversation.
  it('holds the transcript blank rather than showing an unrelated session', async () => {
    const chat = usePendingChats.getState()
      .startPendingChat({ agentId: 'agent-1', sessionId: null, text: 'awaiting a session' });
    await setupWithSession([{ role: 'assistant', content: 'older-session-reply', ts: 1 }]);

    expect(await screen.findByTestId('pending-user-message')).toBeInTheDocument();
    expect(screen.queryByText('older-session-reply')).not.toBeInTheDocument();

    // Settling the send releases the hold, and the session it produced — now
    // the newest — is selected.
    act(() => usePendingChats.getState().clearPendingChat(chat));
    expect(await screen.findByText('older-session-reply')).toBeInTheDocument();
  });

  it('leaves the selected session alone when no send is in flight', async () => {
    jest.useFakeTimers();

    const older = sessionEntry('sess-1', 1000, [{ role: 'assistant', content: 'older-session-reply', ts: 1 }]);
    const newer = sessionEntry('sess-2', 2000, [{ role: 'assistant', content: 'newer-session-reply', ts: 2 }]);
    const agent = { agentId: 'agent-1', status: 'RUNNING', tasks: 0 };
    mockVenue.agents.list.mockResolvedValue({ agents: [agent] });
    mockVenue.agents.info.mockResolvedValue(agent);
    mockVenue.workspace.read.mockResolvedValue({ value: [] });
    mockVenue.workspace.slice.mockResolvedValue({ values: [older] });
    mockVenue.agent.mockReturnValue({ chatSession: (sid?: string) => ({ sessionId: sid }) });
    await renderExplorer();

    await screen.findByText('older-session-reply');

    mockVenue.workspace.slice.mockResolvedValue({ values: [older, newer] });
    await act(async () => { jest.advanceTimersByTime(3100); });

    expect(screen.getByText('older-session-reply')).toBeInTheDocument();
    expect(screen.queryByText('newer-session-reply')).not.toBeInTheDocument();
  });
});

// A null session means two different things — "nothing picked yet", which
// auto-select resolves, and "the user asked for a fresh chat", which it must
// not. Conflating them made New chat snap straight back to the newest session.
describe('AgentExplorer new chat', () => {
  afterEach(() => jest.useRealTimers());

  it('stays on a requested new chat instead of reselecting the newest session', async () => {
    jest.useFakeTimers();
    await setupWithSession([{ role: 'assistant', content: 'older-session-reply', ts: 1 }]);
    expect(await screen.findByText('older-session-reply')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('new-chat'));
    await waitFor(() =>
      expect(screen.queryByText('older-session-reply')).not.toBeInTheDocument());

    // ...and a poll landing mid-compose must not drag it back either.
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(screen.queryByText('older-session-reply')).not.toBeInTheDocument();
  });
});

describe('AgentExplorer transcript rendering', () => {
  it('unwraps single-string-field envelopes and labels task-originated turns', async () => {
    await setupWithSession([
      { role: 'user', source: 'request', content: { task: 'Tell me about the grid' }, ts: 1 },
      { role: 'assistant', source: 'transition', content: 'Here is the grid overview', ts: 2 },
    ]);

    // {task: "..."} is a lossless envelope — shown as its text, with a
    // provenance label marking it as task-originated rather than typed chat.
    expect(await screen.findByText('Tell me about the grid')).toBeInTheDocument();
    expect(screen.getByTestId('turn-source-label')).toBeInTheDocument();
    expect(screen.getByText('Here is the grid overview')).toBeInTheDocument();
  });

  it('renders multi-field content as full JSON so no field is silently dropped', async () => {
    await setupWithSession([
      { role: 'user', source: 'chat', content: { text: 'just this', extra: 'must-stay-visible' }, ts: 1 },
    ]);

    // The old probe-based unwrap would have shown only "just this" and
    // hidden `extra` from the transcript entirely.
    expect(await screen.findByText(/must-stay-visible/)).toBeInTheDocument();
    expect(screen.queryByText('just this')).not.toBeInTheDocument();
  });
});
