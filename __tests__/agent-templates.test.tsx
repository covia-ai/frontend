import '@testing-library/jest-dom';
import { renderHook, waitFor } from '@testing-library/react';

const read = jest.fn();
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => ({ workspace: { read } }),
}));

import { useAgentTemplates } from '@/hooks/use-agent-templates';

// The venue tree at v/agents/templates: keys → configs, arbitrary order.
const TREE = {
  reader: { description: 'read', llmOperation: 'v/ops/langchain/openai' },
  skilled: { description: 'recommended default', skills: ['w/skills', 'v/skills'] },
  goaltree: { description: 'planner' },
  full: { description: 'full frontier', tools: ['v/ops/agent/create'] },
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
