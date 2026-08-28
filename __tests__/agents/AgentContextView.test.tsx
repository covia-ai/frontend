import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockNotifyError = jest.fn();
jest.mock('@/lib/notify', () => ({
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
}));

const mockRunOperation = jest.fn();
const mockVenue: any = {
  baseUrl: 'https://venue.example',
  operations: { run: mockRunOperation },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { AgentContextView } from '@/components/agent-explorer/AgentContextView';
import type { Session } from '@/config/types';

const sessions: Session[] = [
  { sessionId: 'session-1', conversation: [], created: 1700000000000 },
  { sessionId: 'session-2', conversation: [], created: 1700000100000 },
];

describe('AgentContextView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never fetches on mount — only on an explicit "Load context" click', () => {
    render(
      <AgentContextView
        agentId="agent-1"
        sessions={sessions}
        initialSessionId="session-1"
        onBack={jest.fn()}
      />,
    );
    expect(mockRunOperation).not.toHaveBeenCalled();
  });

  it('loads context for the selected session via v/ops/agent/context on click', async () => {
    const user = userEvent.setup();
    mockRunOperation.mockResolvedValue({ messages: [{ role: 'user', content: 'hi' }] });
    render(
      <AgentContextView
        agentId="agent-1"
        sessions={sessions}
        initialSessionId="session-1"
        onBack={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('load-context-button'));

    await waitFor(() =>
      expect(mockRunOperation).toHaveBeenCalledWith('v/ops/agent/context', {
        agentId: 'agent-1',
        sessionId: 'session-1',
      }),
    );
    expect(await screen.findByText(/"role": "user"/)).toBeInTheDocument();
  });

  it('clears previously-loaded context when the session selection changes', async () => {
    const user = userEvent.setup();
    mockRunOperation.mockResolvedValue({ messages: ['from session 1'] });
    render(
      <AgentContextView
        agentId="agent-1"
        sessions={sessions}
        initialSessionId="session-1"
        onBack={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('load-context-button'));
    await screen.findByText(/from session 1/);

    await user.click(screen.getByTestId('context-session-select'));
    await user.click(await screen.findByText(/ession-2/));

    expect(screen.queryByText(/from session 1/)).not.toBeInTheDocument();
    expect(mockRunOperation).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failure via notifyError', async () => {
    const user = userEvent.setup();
    mockRunOperation.mockRejectedValue(new Error('boom'));
    render(
      <AgentContextView
        agentId="agent-1"
        sessions={sessions}
        initialSessionId="session-1"
        onBack={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('load-context-button'));

    await waitFor(() =>
      expect(mockNotifyError).toHaveBeenCalledWith(
        'Unable to load agent context',
        expect.any(Error),
        'https://venue.example',
      ),
    );
  });
});
