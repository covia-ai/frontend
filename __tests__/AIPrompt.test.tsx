import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AIPrompt } from '@/components/AIPrompt';

const mockUseAuthenticatedVenue = jest.fn();
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockUseAuthenticatedVenue(),
}));

function makeVenue(overrides: {
  existingAgents?: string[];
  agentStatus?: string;
  secrets?: string[];
} = {}) {
  const existingAgents = overrides.existingAgents ?? [];
  const agentStatus = overrides.agentStatus ?? 'active';
  return {
    agents: {
      list: jest.fn().mockResolvedValue({
        agents: existingAgents.map((agentId) => ({ agentId, status: agentStatus, tasks: 0 })),
      }),
      create: jest.fn().mockResolvedValue({ agentId: 'default-agent', status: 'active', created: true }),
      request: jest.fn().mockResolvedValue({ id: 'job-1', status: 'PENDING' }),
      resume: jest.fn().mockResolvedValue({ agentId: 'default-agent', status: 'SLEEPING' }),
    },
    secrets: {
      list: jest.fn().mockResolvedValue(overrides.secrets ?? []),
    },
  };
}

describe('Chat Component', () => {
  beforeEach(() => {
    mockUseAuthenticatedVenue.mockReset();
    mockUseAuthenticatedVenue.mockReturnValue(null);
  });

  test('renders chat container', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });

  test('renders input field', () => {
    render(<AIPrompt />);
    expect(screen.getByPlaceholderText('Add a prompt and click the magic wand...')).toBeInTheDocument();
  });

  test('renders chat button', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-button')).toBeInTheDocument();
  });

  test('chat button is disabled when prompt is empty', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-button')).toBeDisabled();
  });
});

describe('AIPrompt — default agent reuse vs creation', () => {
  beforeEach(() => {
    mockUseAuthenticatedVenue.mockReset();
  });

  it('reuses an existing default-agent directly — no secrets lookup, no create call', async () => {
    const venue = makeVenue({ existingAgents: ['default-agent'] });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        'default-agent',
        { task: 'Do something useful' },
        false,
      );
    });
    expect(venue.agents.create).not.toHaveBeenCalled();
    expect(venue.secrets.list).not.toHaveBeenCalled();
  });

  it('resumes a SUSPENDED default-agent before sending the task', async () => {
    const venue = makeVenue({ existingAgents: ['default-agent'], agentStatus: 'SUSPENDED' });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.resume).toHaveBeenCalledWith('default-agent');
    });
    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        'default-agent',
        { task: 'Do something useful' },
        false,
      );
    });
    expect(venue.agents.create).not.toHaveBeenCalled();
  });

  it('recreates a TERMINATED default-agent instead of resuming it', async () => {
    const venue = makeVenue({
      existingAgents: ['default-agent'],
      agentStatus: 'TERMINATED',
      secrets: ['ANTHROPIC_API_KEY'],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.create).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'default-agent', overwrite: true }),
      );
    });
    expect(venue.agents.resume).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        'default-agent',
        { task: 'Do something useful' },
        false,
      );
    });
  });

  it('creates default-agent on first use when a single LLM key is present, then sends the task', async () => {
    const venue = makeVenue({ existingAgents: [], secrets: ['ANTHROPIC_API_KEY'] });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.create).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'default-agent' }),
      );
    });
    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        'default-agent',
        { task: 'Do something useful' },
        false,
      );
    });
  });

  it('shows the LLM key picker when default-agent does not exist and multiple keys are present', async () => {
    const venue = makeVenue({
      existingAgents: [],
      secrets: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    expect(await screen.findByTestId('chat-picker-dialog')).toBeInTheDocument();
    expect(venue.agents.create).not.toHaveBeenCalled();
  });

  it('shows the add-key dialog when default-agent does not exist and no key is present', async () => {
    const venue = makeVenue({ existingAgents: [], secrets: [] });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    expect(await screen.findByTestId('chat-dialog')).toBeInTheDocument();
    expect(venue.agents.create).not.toHaveBeenCalled();
  });
});
