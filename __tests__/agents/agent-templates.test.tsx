import '@testing-library/jest-dom';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const read = jest.fn();
const mockVenue = {
  workspace: { read },
  secrets: { list: jest.fn().mockResolvedValue(['ANTHROPIC_API_KEY']) },
  agents: { create: jest.fn() },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => true,
}));

import { useAgentTemplates } from '@/hooks/use-agent-templates';
import { AgentTemplates } from '@/components/AgentTemplates';

// The venue tree at v/agents/templates: keys → configs, arbitrary order.
const TREE = {
  reader: { description: 'read', llmOperation: 'v/ops/langchain/openai' },
  skilled: {
    name: 'Skilled Agent Template',
    description: 'recommended default',
    agent: {
      config: {
        systemPrompt: 'Use skills when needed.',
        skills: ['w/skills', 'v/skills'],
        caps: [{ with: 'w/', can: 'crud/read' }],
      },
    },
  },
  goaltree: { description: 'planner' },
  full: { description: 'full frontier', tools: ['v/ops/agent/create'] },
  layered: {
    name: 'Layered',
    agent: {
      config: ['v/agents/templates/reader', { responseFormat: { name: 'Result' } }],
      state: { seeded: true },
    },
  },
  stateful: { name: 'State only', agent: { state: { ready: true } } },
};

describe('useAgentTemplates', () => {
  beforeEach(() => read.mockReset());

  it('reads v/agents/templates and flattens to keyed templates', async () => {
    read.mockResolvedValue({ value: TREE });
    const { result } = renderHook(() => useAgentTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(read).toHaveBeenCalledWith('v/agents/templates');
    expect(result.current.templates.map((t) => t.key)).toContain('skilled');
    expect(result.current.templates.find((t) => t.key === 'skilled')?.skills).toEqual(['w/skills', 'v/skills']);
    expect(result.current.templates.find((t) => t.key === 'skilled')?.systemPrompt).toBe('Use skills when needed.');
    expect(result.current.templates.find((t) => t.key === 'skilled')?.config).toMatchObject({
      caps: [{ with: 'w/', can: 'crud/read' }],
    });
  });

  it('preserves canonical ordered layers and initial state for agent:create', async () => {
    read.mockResolvedValue({ value: TREE });
    const { result } = renderHook(() => useAgentTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.templates.find((t) => t.key === 'layered')?.config).toEqual([
      'v/agents/templates/reader',
      { responseFormat: { name: 'Result' } },
      { state: { seeded: true } },
    ]);
    expect(result.current.templates.find((t) => t.key === 'stateful')?.config).toEqual({
      state: { ready: true },
    });
  });

  it('orders skilled first (recommended default), then the rest', async () => {
    read.mockResolvedValue({ value: TREE });
    const { result } = renderHook(() => useAgentTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates[0].key).toBe('skilled');
    // full precedes reader precedes goaltree in the preferred order.
    const keys = result.current.templates.map((t) => t.key);
    expect(keys.indexOf('full')).toBeLessThan(keys.indexOf('reader'));
    expect(keys.indexOf('reader')).toBeLessThan(keys.indexOf('goaltree'));
  });

  it('uses each compact, readable template card as the create action', async () => {
    read.mockResolvedValue({ value: { skilled: TREE.skilled } });
    const user = userEvent.setup();
    render(<AgentTemplates />);

    const card = await screen.findByRole('button', { name: 'Use Skilled template' });
    expect(card).toHaveClass('min-h-28');
    expect(card.querySelector('.text-base')).toHaveTextContent('Skilled');
    expect(screen.queryByText('Use Template')).not.toBeInTheDocument();

    await user.click(card);
    expect(await screen.findByText('Create a new agent')).toBeInTheDocument();
  });

  it('is empty (not thrown) when the venue publishes none', async () => {
    read.mockResolvedValue({ value: null });
    const { result } = renderHook(() => useAgentTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates).toEqual([]);
  });

  it('swallows a read failure into an empty list', async () => {
    read.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAgentTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates).toEqual([]);
  });
});
