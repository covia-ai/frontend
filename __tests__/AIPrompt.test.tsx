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
  existingAgents?: string[] | Array<{ agentId: string; status: string }>;
  agentStatus?: string;
  secrets?: string[];
} = {}) {
  const rawAgents = overrides.existingAgents ?? [];
  const agentStatus = overrides.agentStatus ?? 'active';
  const agents = rawAgents.map((a) =>
    typeof a === 'string' ? { agentId: a, status: agentStatus, tasks: 0 } : { tasks: 0, ...a }
  );
  return {
    agents: {
      list: jest.fn().mockResolvedValue({ agents }),
      create: jest.fn().mockResolvedValue({ agentId: 'default-agent', status: 'active', created: true }),
      request: jest.fn().mockResolvedValue({ id: 'job-1', status: 'PENDING' }),
      resume: jest.fn().mockResolvedValue({ agentId: 'default-agent', status: 'SLEEPING' }),
    },
    secrets: {
      list: jest.fn().mockResolvedValue(overrides.secrets ?? []),
    },
  };
}

// Opens the "⋮" agent picker menu and clicks the option with the given visible text.
async function pickAgentOption(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByTestId('agent-picker'));
  await user.click(await screen.findByRole('menuitemradio', { name: label }));
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

describe('AIPrompt — agent picker', () => {
  beforeEach(() => {
    mockUseAuthenticatedVenue.mockReset();
  });

  it('shows default-agent subtext, and lists other existing agents plus a New agent option in the ⋮ menu', async () => {
    const venue = makeVenue({
      existingAgents: [
        { agentId: 'default-agent', status: 'active' },
        { agentId: 'research-bot', status: 'active' },
      ],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    expect(screen.getByText(/This request will go to the default agent/)).toBeInTheDocument();

    await user.click(screen.getByTestId('agent-picker'));
    expect(await screen.findByRole('menuitemradio', { name: 'research-bot' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: '+ New agent' })).toBeInTheDocument();
  });

  it('sends directly to a different existing agent selected from the picker', async () => {
    const venue = makeVenue({
      existingAgents: [
        { agentId: 'default-agent', status: 'active' },
        { agentId: 'research-bot', status: 'active' },
      ],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await pickAgentOption(user, 'research-bot');
    expect(screen.getByText(/This request will go to "research-bot"/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        'research-bot',
        { task: 'Do something useful' },
        false,
      );
    });
    expect(venue.agents.create).not.toHaveBeenCalled();
    expect(venue.secrets.list).not.toHaveBeenCalled();
  });

  it('resumes a SUSPENDED non-default agent selected from the picker', async () => {
    const venue = makeVenue({
      existingAgents: [{ agentId: 'research-bot', status: 'SUSPENDED' }],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await pickAgentOption(user, 'research-bot');

    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.resume).toHaveBeenCalledWith('research-bot');
    });
    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        'research-bot',
        { task: 'Do something useful' },
        false,
      );
    });
  });

  it('creates a distinctly-named workspace agent when "+ New agent" is selected', async () => {
    const venue = makeVenue({
      existingAgents: [{ agentId: 'default-agent', status: 'active' }],
      secrets: ['ANTHROPIC_API_KEY'],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await pickAgentOption(user, '+ New agent');
    expect(screen.getByText(/This request will go to a new agent/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: expect.stringMatching(/^workspace-agent-/),
          overwrite: true,
        }),
      );
    });
    const createdAgentId = venue.agents.create.mock.calls[0][0].agentId;
    await waitFor(() => {
      expect(venue.agents.request).toHaveBeenCalledWith(
        createdAgentId,
        { task: 'Do something useful' },
        false,
      );
    });
  });
});
