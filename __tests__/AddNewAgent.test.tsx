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
  agents: {
    create: jest.fn().mockResolvedValue({ agentId: 'test-agent', status: 'active' }),
    request: jest.fn().mockResolvedValue({}),
  },
  secrets: {
    // ANTHROPIC_API_KEY present so the default provider (anthropic) is
    // ready and the Create button isn't disabled by the key-readiness gate.
    list: jest.fn().mockResolvedValue(['ANTHROPIC_API_KEY']),
  },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { AddNewAgent } from '@/components/AddNewAgent';

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
  });

  it('renders the trigger button', () => {
    render(<AddNewAgent />);
    expect(screen.getByTestId('create-agent-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('create-agent-trigger')).toHaveTextContent('Create Agent');
  });

  it('renders the component with initial state after opening dialog', async () => {
    await renderAndOpenDialog();

    expect(screen.getAllByText(/Create a new agent/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('System Prompt:')).toBeInTheDocument();
    expect(screen.getByText('Initial Command:')).toBeInTheDocument();
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
      'e.g., You are a helpful customer support agent that...'
    );
    expect(textarea).toBeInTheDocument();
  });

  it('shows initial command input', async () => {
    await renderAndOpenDialog();
    const input = screen.getByPlaceholderText(
      'e.g., Greet the user and ask how you can help'
    );
    expect(input).toBeInTheDocument();
  });

  // covia-ai/frontend follow-up: creation used to just call onCreated (a
  // list-refetch callback), leaving the user on whichever page they created
  // the agent from — now it should take them straight to the new agent.
  it("navigates to the new agent's explorer page instead of just refetching the list", async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'My Test Agent');

    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/agents/explorer?agentId=test-agent');
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

    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('System Prompt:')).toBeInTheDocument();
    expect(screen.getByText('Initial Command:')).toBeInTheDocument();
  });

  it('blocks "assistant" as a reserved id — warns and disables Create', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'Assistant');

    expect(screen.getByText(/is reserved for the workspace prompt bar/i)).toBeInTheDocument();
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

    expect(screen.queryByText(/is reserved for the workspace prompt bar/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('create-agent')).not.toBeDisabled();
  });
});
