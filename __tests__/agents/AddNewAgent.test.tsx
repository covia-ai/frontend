import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/lib/notify', () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: err, jobHref: undefined }),
}));

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Return a stable object reference so the useEffect dep [venue] doesn't
// fire on every render and reset controlled-input state. Declared with the
// `mock` prefix so it's also usable inside test bodies (Jest's hoisting
// allowlist only exempts identifiers starting with "mock").
const mockVenue = {
  venueId: 'venue-1',
  baseUrl: 'https://venue.example',
  agents: {
    create: jest.fn().mockResolvedValue({ agentId: 'test-agent', status: 'active' }),
    request: jest.fn().mockResolvedValue({}),
  },
  secrets: {
    // ANTHROPIC_API_KEY present so the default provider (anthropic) is
    // ready and the Create button isn't disabled by the key-readiness gate.
    list: jest.fn().mockResolvedValue(['ANTHROPIC_API_KEY']),
  },
  workspace: {
    read: jest.fn().mockResolvedValue({ exists: false }),
    write: jest.fn().mockResolvedValue({}),
  },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { AddNewAgent } from '@/components/AddNewAgent';
import { notifySuccess, notifyWarning } from '@/lib/notify';

async function renderAndOpenDialog() {
  const user = userEvent.setup();
  render(<AddNewAgent />);
  const trigger = screen.getByTestId('create-agent-trigger');
  await user.click(trigger);
  return user;
}

describe('AddNewAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.workspace.read.mockResolvedValue({ exists: false });
    mockVenue.workspace.write.mockResolvedValue({});
  });

  it('renders the trigger button', () => {
    render(<AddNewAgent />);
    expect(screen.getByTestId('create-agent-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('create-agent-trigger')).toHaveTextContent('Create Agent');
  });

  it('renders the component with initial state after opening dialog', async () => {
    await renderAndOpenDialog();

    expect(screen.getAllByText(/Create a new agent/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('System prompt')).toBeInTheDocument();
    expect(screen.getByText(/First task/)).toBeInTheDocument();
    expect(screen.getByTestId('agent-identity-column')).toBeInTheDocument();
    expect(screen.getByTestId('agent-settings-column')).toBeInTheDocument();
  });

  it('updates agent name when user types', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'Test Agent');

    expect(input).toHaveValue('Test Agent');
  });

  it('renders LLM provider select with default value', async () => {
    await renderAndOpenDialog();
    expect(screen.getByText('Anthropic (Claude)')).toBeInTheDocument();
  });

  it('renders create button with correct attributes', async () => {
    await renderAndOpenDialog();
    const createButton = screen.getByTestId('create-agent');
    expect(createButton).toHaveAttribute('aria-label', 'create agent');
  });

  it('shows system prompt textarea', async () => {
    await renderAndOpenDialog();
    const textarea = screen.getByPlaceholderText(
      "Describe the agent's role, behaviour, and boundaries."
    );
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('placeholder:text-muted-foreground/60');
    expect(textarea).toHaveClass('h-72', 'overflow-y-auto');
  });

  it('shows initial command input', async () => {
    await renderAndOpenDialog();
    const input = screen.getByPlaceholderText(
      'e.g., Greet the user and ask how you can help'
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('placeholder:text-muted-foreground/60');
  });

  // covia-ai/frontend follow-up: creation used to just call onCreated (a
  // list-refetch callback), leaving the user on whichever page they created
  // the agent from — now it should take them straight to the new agent.
  it("navigates to the new agent's chat instead of just refetching the list", async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'My Test Agent');

    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/agents/chat?agentId=test-agent');
    });
  });

  it('omits model from the agent config when left on venue default', async () => {
    const user = await renderAndOpenDialog();
    await user.type(screen.getByPlaceholderText('e.g., Customer Support Agent'), 'My Agent');
    await user.click(screen.getByTestId('create-agent'));

    await waitFor(() => expect(mockVenue.agents.create).toHaveBeenCalled());
    const config = mockVenue.agents.create.mock.calls[0][0].config;
    expect(config).not.toHaveProperty('model');
  });

  it('passes a picked model into the agent config', async () => {
    const user = await renderAndOpenDialog();
    await user.type(screen.getByPlaceholderText('e.g., Customer Support Agent'), 'My Agent');

    await user.click(screen.getByTestId('model-select'));
    await user.click(await screen.findByRole('option', { name: 'claude-opus-4-8' }));
    await user.click(screen.getByTestId('create-agent'));

    await waitFor(() => expect(mockVenue.agents.create).toHaveBeenCalled());
    const config = mockVenue.agents.create.mock.calls[0][0].config;
    expect(config.model).toBe('claude-opus-4-8');
  });

  it('preserves cloned creation settings while allowing identity fields to change', async () => {
    const user = userEvent.setup();
    render(
      <AddNewAgent
        initialAgentName="writer copy"
        initialSystemPrompt="You are a careful writer."
        initialProvider="anthropic"
        initialModel="claude-opus-4-8"
        preferAvailableProvider={false}
        initialConfig={{
          operation: "v/ops/llmagent/chat",
          skills: ["w/skills"],
          customSetting: "preserve-me",
        }}
      />,
    );
    await user.click(screen.getByTestId('create-agent-trigger'));

    expect(screen.getByPlaceholderText('e.g., Customer Support Agent')).toHaveValue('writer copy');
    expect(screen.getByTestId('model-select')).toHaveTextContent('claude-opus-4-8');
    await user.click(screen.getByTestId('create-agent'));

    await waitFor(() => expect(mockVenue.agents.create).toHaveBeenCalled());
    expect(mockVenue.agents.create.mock.calls[0][0].config).toMatchObject({
      operation: 'v/ops/llmagent/chat',
      llmOperation: 'v/ops/langchain/anthropic',
      model: 'claude-opus-4-8',
      systemPrompt: 'You are a careful writer.',
      skills: ['w/skills'],
      customSetting: 'preserve-me',
    });
    expect(mockVenue.agents.create.mock.calls[0][0].config).not.toHaveProperty('state');
  });

  it('preserves ordered template layers and appends editable overrides last', async () => {
    const user = userEvent.setup();
    render(
      <AddNewAgent
        initialAgentName="layered agent"
        initialSystemPrompt="Final instructions"
        initialConfig={[
          'v/agents/templates/reader',
          {
            systemPrompt: 'Base instructions',
            caps: [{ with: 'w/results/', can: 'crud/write' }],
            responseFormat: { name: 'Result', schema: { type: 'object' } },
          },
        ]}
      />,
    );
    await user.click(screen.getByTestId('create-agent-trigger'));
    await user.click(screen.getByTestId('create-agent'));

    await waitFor(() => expect(mockVenue.agents.create).toHaveBeenCalled());
    expect(mockVenue.agents.create.mock.calls[0][0].config).toEqual([
      'v/agents/templates/reader',
      {
        caps: [{ with: 'w/results/', can: 'crud/write' }],
        responseFormat: { name: 'Result', schema: { type: 'object' } },
      },
      {
        llmOperation: 'v/ops/langchain/anthropic',
        systemPrompt: 'Final instructions',
      },
    ]);
  });

  it('passes a custom-typed model into the agent config', async () => {
    const user = await renderAndOpenDialog();
    await user.type(screen.getByPlaceholderText('e.g., Customer Support Agent'), 'My Agent');

    await user.click(screen.getByTestId('model-select'));
    await user.click(await screen.findByRole('option', { name: 'Custom…' }));
    await user.type(screen.getByTestId('model-custom-input'), 'my-org/experimental-model');
    await user.click(screen.getByTestId('create-agent'));

    await waitFor(() => expect(mockVenue.agents.create).toHaveBeenCalled());
    const config = mockVenue.agents.create.mock.calls[0][0].config;
    expect(config.model).toBe('my-org/experimental-model');
  });

  it('resets the model choice when the provider changes', async () => {
    const user = await renderAndOpenDialog();
    await user.type(screen.getByPlaceholderText('e.g., Customer Support Agent'), 'My Agent');

    // Pick an Anthropic model, then switch provider — the id must not leak.
    await user.click(screen.getByTestId('model-select'));
    await user.click(await screen.findByRole('option', { name: 'claude-opus-4-8' }));
    const providerSelect = screen.getAllByRole('combobox')[0];
    await user.click(providerSelect);
    await user.click(await screen.findByRole('option', { name: 'Ollama (local)' }));

    await user.click(screen.getByTestId('create-agent'));
    await waitFor(() => expect(mockVenue.agents.create).toHaveBeenCalled());
    const config = mockVenue.agents.create.mock.calls[0][0].config;
    expect(config).not.toHaveProperty('model');
    expect(config.llmOperation).toBe('v/ops/langchain/ollama');
  });

  it('create button is disabled when agent name is empty', async () => {
    await renderAndOpenDialog();
    const createButton = screen.getByTestId('create-agent');
    expect(createButton).toBeDisabled();
  });

  it('displays all form labels correctly', async () => {
    await renderAndOpenDialog();

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('System prompt')).toBeInTheDocument();
    expect(screen.getByText(/First task/)).toBeInTheDocument();
  });

  it('saves a canonical workspace template without creating an agent', async () => {
    const user = await renderAndOpenDialog();
    await user.type(screen.getByPlaceholderText('e.g., Customer Support Agent'), 'Support Agent');
    await user.type(
      screen.getByPlaceholderText("Describe the agent's role, behaviour, and boundaries."),
      'Help customers clearly.',
    );
    await user.click(screen.getByTestId('save-agent-template'));

    await waitFor(() => {
      expect(mockVenue.workspace.write).toHaveBeenCalledWith(
        'w/templates/support-agent',
        {
          name: 'Support Agent',
          agent: {
            config: {
              operation: 'v/ops/llmagent/chat',
              llmOperation: 'v/ops/langchain/anthropic',
              systemPrompt: 'Help customers clearly.',
            },
          },
        },
      );
    });
    expect(mockVenue.agents.create).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Template saved', {
      description: 'w/templates/support-agent',
    });
  });

  it('does not overwrite an existing workspace template', async () => {
    mockVenue.workspace.read.mockResolvedValue({ exists: true });
    const user = await renderAndOpenDialog();
    await user.type(screen.getByPlaceholderText('e.g., Customer Support Agent'), 'Existing');
    await user.click(screen.getByTestId('save-agent-template'));

    await waitFor(() => expect(notifyWarning).toHaveBeenCalledWith(
      'A template with this ID already exists',
      { description: 'w/templates/existing' },
    ));
    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
  });

  it('blocks "assistant" as a reserved id — warns and disables Create', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'Assistant');

    expect(screen.getByText(/is reserved/i)).toBeInTheDocument();
    const createButton = screen.getByTestId('create-agent');
    expect(createButton).toBeDisabled();

    // Disabled buttons no-op on click, so this also confirms the guard
    // isn't bypassable from the UI.
    await user.click(createButton);
    expect(mockVenue.agents.create).not.toHaveBeenCalled();
  });

  it('allows editing the Agent ID away from the reserved assistant id', async () => {
    const user = await renderAndOpenDialog();

    const nameInput = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(nameInput, 'Assistant');
    expect(screen.getByTestId('create-agent')).toBeDisabled();

    const idInput = screen.getByPlaceholderText('e.g., customer-support-agent');
    await user.clear(idInput);
    await user.type(idInput, 'my-assistant');

    expect(screen.queryByText(/is reserved/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('create-agent')).not.toBeDisabled();
  });
});
