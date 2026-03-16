import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddNewAgent } from '@/components/AddNewAgent';
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

    // "Create a new agent" appears on both trigger button and dialog title label
    expect(screen.getAllByText(/Create a new agent/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('Select LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('Agent Engine:')).toBeInTheDocument();
  });

  it('updates agent name when user types', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'Test Agent');

    expect(input).toHaveValue('Test Agent');
  });

  it('displays all LLM provider radio options', async () => {
    await renderAndOpenDialog();

    expect(screen.getByLabelText('Claude 3.5')).toBeInTheDocument();
    expect(screen.getByLabelText('Gemini Pro')).toBeInTheDocument();
    expect(screen.getByLabelText('OpenAI GPT-4')).toBeInTheDocument();
  });

  it('has Claude 3.5 selected by default', async () => {
    await renderAndOpenDialog();

    const claudeRadio = screen.getByRole('radio', { name: /claude 3.5/i });
    expect(claudeRadio).toBeChecked();
  });

  it('allows user to select different LLM provider', async () => {
    const user = await renderAndOpenDialog();

    const geminiRadio = screen.getByRole('radio', { name: /gemini pro/i });
    await user.click(geminiRadio);

    expect(geminiRadio).toBeChecked();
  });

  it('shows advanced options accordion', async () => {
    await renderAndOpenDialog();

    expect(screen.getByText('Advanced Options')).toBeInTheDocument();
  });

  it('displays initial state textarea after expanding accordion', async () => {
    const user = await renderAndOpenDialog();

    // Expand the accordion
    const accordionTrigger = screen.getByText('Advanced Options');
    await user.click(accordionTrigger);

    const textarea = screen.getByLabelText(/initial state/i);
    expect(textarea).toHaveValue('{}');
  });

  it('shows helper text for initial state after expanding accordion', async () => {
    const user = await renderAndOpenDialog();

    const accordionTrigger = screen.getByText('Advanced Options');
    await user.click(accordionTrigger);

    expect(screen.getByText(/Must be valid JSON/i)).toBeInTheDocument();
  });

  it('calls toast with success message when create button is clicked', async () => {
    const user = await renderAndOpenDialog();

    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'My Test Agent');

    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);

    expect(toast).toHaveBeenCalledWith('Success !!', {
      description: 'Agent My Test Agent created',
    });
  });

  it('creates agent with default values when no changes are made', async () => {
    const user = await renderAndOpenDialog();

    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);

    expect(toast).toHaveBeenCalledWith('Success !!', {
      description: 'Agent  created',
    });
  });

  it('allows selecting OpenAI GPT-4 as LLM provider', async () => {
    const user = await renderAndOpenDialog();

    const openaiRadio = screen.getByRole('radio', { name: /openai gpt-4/i });
    await user.click(openaiRadio);

    expect(openaiRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /claude 3.5/i })).not.toBeChecked();
  });

  it('displays all form labels correctly', async () => {
    await renderAndOpenDialog();

    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('Select LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('Agent Engine:')).toBeInTheDocument();
  });

  it('renders create button with correct attributes', async () => {
    await renderAndOpenDialog();

    const createButton = screen.getByRole('button', { name: /create agent/i });
    expect(createButton).toHaveAttribute('aria-label', 'create agent');
  });

  it('maintains form state across multiple interactions', async () => {
    const user = await renderAndOpenDialog();

    // Set agent name
    const nameInput = screen.getByTestId('agent-name');
    await user.type(nameInput, 'Multi-step Agent');

    // Select different LLM
    const geminiRadio = screen.getByRole('radio', { name: /gemini pro/i });
    await user.click(geminiRadio);

    // Verify all states are maintained
    expect(nameInput).toHaveValue('Multi-step Agent');
    expect(geminiRadio).toBeChecked();
  });
});
