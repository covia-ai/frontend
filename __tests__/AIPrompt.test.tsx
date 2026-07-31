import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AIPrompt } from '@/components/AIPrompt';

// One recorder across every notify kind — most tests only care that a
// notification fired, and the kind rides along as the first argument.
const mockToast = jest.fn();
jest.mock('@/lib/notify', () => ({
  notifySuccess: (...args: any[]) => mockToast('success', ...args),
  notifyError: (title: string, err?: unknown, _target?: string) =>
    mockToast('error', title, { description: err instanceof Error ? err.message : err === undefined ? undefined : String(err) }),
  notifyWarning: (...args: any[]) => mockToast('warning', ...args),
  notifyInfo: (...args: any[]) => mockToast('info', ...args),
}));

const mockUseAuthenticatedVenue = jest.fn();
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockUseAuthenticatedVenue(),
}));

// Mirrors the real venue/src/main/resources/agent-templates/skilled.json —
// note it carries its own `model`, which proceedWithKey must never forward
// (a model pinned for one provider is meaningless once llmOperation is
// swapped for whichever key was actually detected).
const SKILLED_TEMPLATE = {
  name: 'Skilled Agent Template',
  systemPrompt: 'You are a general-purpose agent on the Covia platform.',
  tools: ['v/ops/covia/read', 'v/ops/covia/list'],
  skills: ['w/skills', 'v/skills'],
  llmOperation: 'v/ops/langchain/openai',
  model: 'gpt-5.4-mini',
  defaultTools: false,
};

function makeVenue(overrides: {
  existingAgents?: string[] | Array<{ agentId: string; status: string }>;
  agentStatus?: string;
  secrets?: string[];
  templateRead?: { exists: boolean; value?: unknown };
} = {}) {
  const rawAgents = overrides.existingAgents ?? [];
  const agentStatus = overrides.agentStatus ?? 'active';
  const agents = rawAgents.map((a) =>
    typeof a === 'string' ? { agentId: a, status: agentStatus, tasks: 0 } : { tasks: 0, ...a }
  );
  return {
    agents: {
      list: jest.fn().mockResolvedValue({ agents }),
      create: jest.fn().mockResolvedValue({ agentId: 'assistant', status: 'active', created: true }),
      chat: jest.fn().mockResolvedValue({ agentId: 'assistant', sessionId: 's-1', response: 'Reply text' }),
      resume: jest.fn().mockResolvedValue({ agentId: 'assistant', status: 'SLEEPING' }),
    },
    secrets: {
      list: jest.fn().mockResolvedValue(overrides.secrets ?? []),
    },
    workspace: {
      read: jest.fn().mockResolvedValue(
        overrides.templateRead ?? { exists: true, value: SKILLED_TEMPLATE },
      ),
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
    expect(screen.getByLabelText('prompt')).toBeInTheDocument();
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

  it('reuses an existing assistant directly — no secrets lookup, no create call', async () => {
    const venue = makeVenue({ existingAgents: ['assistant'] });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.chat).toHaveBeenCalledWith(
        'assistant',
        'Do something useful',
      );
    });
    expect(venue.agents.create).not.toHaveBeenCalled();
    expect(venue.secrets.list).not.toHaveBeenCalled();
  });

  it('resumes a SUSPENDED assistant before sending the message', async () => {
    const venue = makeVenue({ existingAgents: ['assistant'], agentStatus: 'SUSPENDED' });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.resume).toHaveBeenCalledWith('assistant');
    });
    await waitFor(() => {
      expect(venue.agents.chat).toHaveBeenCalledWith(
        'assistant',
        'Do something useful',
      );
    });
    expect(venue.agents.create).not.toHaveBeenCalled();
  });

  it('recreates a TERMINATED assistant instead of resuming it', async () => {
    const venue = makeVenue({
      existingAgents: ['assistant'],
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
        expect.objectContaining({ agentId: 'assistant', overwrite: true }),
      );
    });
    expect(venue.agents.resume).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(venue.agents.chat).toHaveBeenCalledWith(
        'assistant',
        'Do something useful',
      );
    });
  });

  it('creates assistant on first use when a single LLM key is present, then sends the message', async () => {
    const venue = makeVenue({ existingAgents: [], secrets: ['ANTHROPIC_API_KEY'] });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.create).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'assistant' }),
      );
    });
    await waitFor(() => {
      expect(venue.agents.chat).toHaveBeenCalledWith(
        'assistant',
        'Do something useful',
      );
    });
  });

  it('builds the new assistant from the skilled template, not a hardcoded prompt', async () => {
    const venue = makeVenue({ existingAgents: [], secrets: ['ANTHROPIC_API_KEY'] });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.workspace.read).toHaveBeenCalledWith('v/agents/templates/skilled');
    });
    await waitFor(() => {
      expect(venue.agents.create).toHaveBeenCalledWith({
        agentId: 'assistant',
        overwrite: true,
        config: {
          skills: SKILLED_TEMPLATE.skills,
          tools: SKILLED_TEMPLATE.tools,
          defaultTools: SKILLED_TEMPLATE.defaultTools,
          // The detected key's provider wins over the template's own
          // llmOperation, and the template's model is dropped entirely —
          // it was pinned for a different provider.
          operation: 'v/ops/llmagent/chat',
          llmOperation: 'v/ops/langchain/anthropic',
          systemPrompt: SKILLED_TEMPLATE.systemPrompt,
        },
      });
    });
  });

  it('fails closed with a toast when the skilled template cannot be read', async () => {
    const venue = makeVenue({
      existingAgents: [],
      secrets: ['ANTHROPIC_API_KEY'],
      templateRead: { exists: false },
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('error', 'Unable to create agent', expect.anything());
    });
    expect(venue.agents.create).not.toHaveBeenCalled();
    expect(venue.agents.chat).not.toHaveBeenCalled();
  });

  it('treats a legacy "default-agent" as an ordinary agent, never the reserved assistant', async () => {
    const venue = makeVenue({
      existingAgents: [{ agentId: 'default-agent', status: 'active' }],
      secrets: ['ANTHROPIC_API_KEY'],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    // The picker's reserved slot still offers to create "assistant" fresh —
    // the old agent under the legacy id doesn't satisfy it.
    await user.hover(screen.getByTestId('agent-picker'));
    expect((await screen.findAllByText(/Your message will go to the assistant/))[0]).toBeInTheDocument();

    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    // Creates the new reserved slot — never touches/overwrites the legacy one.
    await waitFor(() => {
      expect(venue.agents.create).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'assistant' }),
      );
    });
    expect(venue.agents.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'default-agent' }),
    );
  });

  it('shows the LLM key picker when assistant does not exist and multiple keys are present', async () => {
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

  it('shows the add-key dialog when assistant does not exist and no key is present', async () => {
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

  it('lists other existing agents plus a New agent option in the ⋮ menu', async () => {
    const venue = makeVenue({
      existingAgents: [
        { agentId: 'assistant', status: 'active' },
        { agentId: 'research-bot', status: 'active' },
      ],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.hover(screen.getByTestId('agent-picker'));
    expect((await screen.findAllByText(/Your message will go to the assistant/))[0]).toBeInTheDocument();

    await user.click(screen.getByTestId('agent-picker'));
    expect(await screen.findByRole('menuitemradio', { name: 'research-bot' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: '+ New agent' })).toBeInTheDocument();
  });

  it('sends directly to a different existing agent selected from the picker', async () => {
    const venue = makeVenue({
      existingAgents: [
        { agentId: 'assistant', status: 'active' },
        { agentId: 'research-bot', status: 'active' },
      ],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await pickAgentOption(user, 'research-bot');
    await user.hover(screen.getByTestId('agent-picker'));
    expect((await screen.findAllByText(/Your message will go to "research-bot"/))[0]).toBeInTheDocument();

    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    await waitFor(() => {
      expect(venue.agents.chat).toHaveBeenCalledWith(
        'research-bot',
        'Do something useful',
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
      expect(venue.agents.chat).toHaveBeenCalledWith(
        'research-bot',
        'Do something useful',
      );
    });
  });

  it('creates a distinctly-named workspace agent when "+ New agent" is selected', async () => {
    const venue = makeVenue({
      existingAgents: [{ agentId: 'assistant', status: 'active' }],
      secrets: ['ANTHROPIC_API_KEY'],
    });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await pickAgentOption(user, '+ New agent');
    await user.hover(screen.getByTestId('agent-picker'));
    expect((await screen.findAllByText(/Your message will go to a new agent/))[0]).toBeInTheDocument();

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
      expect(venue.agents.chat).toHaveBeenCalledWith(
        createdAgentId,
        'Do something useful',
      );
    });
  });
});

describe('AIPrompt — chat outcome surfacing', () => {
  beforeEach(() => {
    mockUseAuthenticatedVenue.mockReset();
    mockToast.mockReset();
  });

  it('toasts when the agent sends an empty reply', async () => {
    const venue = makeVenue({ existingAgents: ['assistant'] });
    venue.agents.chat.mockResolvedValue({ agentId: 'assistant', sessionId: 's-1', response: '  ' });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    // Some toast must fire — an empty reply is a silent failure otherwise.
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it('toasts when the chat call fails', async () => {
    const venue = makeVenue({ existingAgents: ['assistant'] });
    venue.agents.chat.mockRejectedValue(new Error('venue unreachable'));
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    const user = userEvent.setup();

    render(<AIPrompt />);
    await user.type(screen.getByLabelText('prompt'), 'Do something useful');
    await user.click(screen.getByTestId('chat-button'));

    // The wire error must reach the user, not vanish into the un-awaited promise.
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('error', expect.any(String), expect.objectContaining({
        description: 'venue unreachable',
      }));
    });
  });
});
