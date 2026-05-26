import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

// Mock the toast function
jest.mock('sonner', () => ({
  toast: jest.fn(),
}));

// Mock Iconbutton used by the dialog trigger
jest.mock('@/components/Iconbutton', () => ({
  Iconbutton: ({ icon, message, label }: any) => (
    <button data-testid="trigger-btn">{label || message}</button>
  ),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock the authenticated venue hook
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => ({
    agents: {
      create: jest.fn().mockResolvedValue({ agentId: 'test-agent', status: 'active' }),
      request: jest.fn().mockResolvedValue({}),
    },
    secrets: {
      list: jest.fn().mockResolvedValue([]),
    },
  }),
}));

import { AddNewAgent } from '@/components/AddNewAgent';

// Helper to open the dialog before querying form elements
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

    // The select trigger should show the default provider (Anthropic)
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

  it('shows error toast when agent name is empty', async () => {
    const user = await renderAndOpenDialog();

    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);

    expect(toast).toHaveBeenCalledWith('Please enter an agent name');
  });

  it('displays all form labels correctly', async () => {
    await renderAndOpenDialog();

    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('System Prompt:')).toBeInTheDocument();
    expect(screen.getByText('Initial Command:')).toBeInTheDocument();
  });
});
