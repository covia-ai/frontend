import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: jest.fn(),
}));

// Must spread ...rest so DialogTrigger asChild can forward onClick/ref.
jest.mock('@/components/IconButton', () => ({
  IconButton: ({ icon, message, label, ...rest }: any) => (
    <button data-testid="trigger-btn" {...rest}>{label || message}</button>
  ),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
  const trigger = screen.getByTestId('trigger-btn');
  await user.click(trigger);
  return user;
}

describe('AddNewAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button', () => {
    render(<AddNewAgent />);
    expect(screen.getByTestId('trigger-btn')).toBeInTheDocument();
    expect(screen.getByTestId('trigger-btn')).toHaveTextContent('Create a new agent');
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
    const createButton = screen.getByRole('button', { name: /create agent/i });
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

  it('calls toast with success message when create button is clicked', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'My Test Agent');

    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Agent created', {
        description: 'Agent "test-agent" is now active',
      });
    });
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

  it('blocks "default-agent" as a reserved id — warns and disables Create', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'Default Agent');

    expect(screen.getByText(/is reserved for the workspace prompt bar/i)).toBeInTheDocument();
    const createButton = screen.getByTestId('create-agent');
    expect(createButton).toBeDisabled();

    // Disabled buttons no-op on click, so this also confirms the guard
    // isn't bypassable from the UI.
    await user.click(createButton);
    expect(mockVenue.agents.create).not.toHaveBeenCalled();
  });

  it('allows editing the Agent ID away from the reserved default-agent id', async () => {
    const user = await renderAndOpenDialog();

    const nameInput = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(nameInput, 'Default Agent');
    expect(screen.getByTestId('create-agent')).toBeDisabled();

    const idInput = screen.getByPlaceholderText('e.g., customer-support-agent');
    await user.clear(idInput);
    await user.type(idInput, 'my-default-agent');

    expect(screen.queryByText(/is reserved for the workspace prompt bar/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('create-agent')).not.toBeDisabled();
  });
});
