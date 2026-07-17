import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

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

function mockContainerRect(container: Element) {
  jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    left: CONTAINER_LEFT,
    width: CONTAINER_WIDTH,
    top: 0, bottom: 0, right: CONTAINER_LEFT + CONTAINER_WIDTH, height: 800,
    x: CONTAINER_LEFT, y: 0, toJSON: () => ({}),
  } as DOMRect);
}

// Resize tests need no selectable agent — an empty list renders just the
// list panel and divider.
async function setup() {
  mockVenue.agents.list.mockResolvedValue({ agents: [] });
  render(<AgentExplorer />);
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
  render(<AgentExplorer />);
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
    render(<AgentExplorer />);

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
    render(<AgentExplorer />);

    expect(await screen.findByTestId('agent-detail-error')).toBeInTheDocument();
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
