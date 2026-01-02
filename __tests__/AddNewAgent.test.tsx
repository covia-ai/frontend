import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddNewAgent } from '@/components/AddNewAgent';
import { toast } from 'sonner';

// Mock the toast function
jest.mock('sonner', () => ({
  toast: jest.fn(),
}));

describe('AddNewAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<AddNewAgent />);
    
    expect(screen.getByText('Create a new agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('Select LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('Agent Engine:')).toBeInTheDocument();
  });

  it('renders the trigger button to open dialog', () => {
    render(<AddNewAgent />);
    
    const triggerButton = screen.getByRole('button', { name: /create a new agent/i });
    expect(triggerButton).toBeInTheDocument();
  });

  it('updates agent name when user types', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'Test Agent');
    
    expect(input).toHaveValue('Test Agent');
  });

  it('displays all LLM provider radio options', () => {
    render(<AddNewAgent />);
    
    expect(screen.getByLabelText('Claude 3.5')).toBeInTheDocument();
    expect(screen.getByLabelText('Gemini Pro')).toBeInTheDocument();
    expect(screen.getByLabelText('OpenAI GPT-4')).toBeInTheDocument();
  });

  it('has Claude 3.5 selected by default', () => {
    render(<AddNewAgent />);
    
    const claudeRadio = screen.getByRole('radio', { name: /claude 3.5/i });
    expect(claudeRadio).toBeChecked();
  });

  it('allows user to select different LLM provider', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    const geminiRadio = screen.getByRole('radio', { name: /gemini pro/i });
    await user.click(geminiRadio);
    
    expect(geminiRadio).toBeChecked();
  });

  it('displays agent engine select dropdown', () => {
    render(<AddNewAgent />);
    
    const selectTrigger = screen.getByRole('combobox', { name: /agent engine/i });
    expect(selectTrigger).toBeInTheDocument();
  });

  it('shows advanced options accordion', () => {
    render(<AddNewAgent />);
    
    expect(screen.getByText('Advanced Options')).toBeInTheDocument();
  });

  it('displays initial state textarea with empty object', () => {
    render(<AddNewAgent />);
    
    const textarea = screen.getByLabelText(/initial state/i);
    expect(textarea).toHaveValue('{}');
  });

  it('shows helper text for initial state', () => {
    render(<AddNewAgent />);
    
    expect(screen.getByText(/Must be valid JSON/i)).toBeInTheDocument();
    expect(screen.getByText(/Leave as {} for empty initial state/i)).toBeInTheDocument();
  });

  it('updates initial state when user types', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    const textarea = screen.getByLabelText(/initial state/i);
    await user.clear(textarea);
    await user.type(textarea, '{{"key": "value"}}');
    
    expect(textarea).toHaveValue('{"key": "value"}');
  });

  it('calls toast with success message when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    const input = screen.getByPlaceholderText('e.g., Customer Support Agent');
    await user.type(input, 'My Test Agent');
    
    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);
    
    expect(toast).toHaveBeenCalledWith('Success !!', {
      description: 'Agent My Test Agent created',
    });
  });

  it('creates agent with default values when no changes are made', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    const createButton = screen.getByTestId('create-agent');
    await user.click(createButton);
    
    expect(toast).toHaveBeenCalledWith('Success !!', {
      description: 'Agent  created',
    });
  });

  it('allows selecting OpenAI GPT-4 as LLM provider', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    const openaiRadio = screen.getByRole('radio', { name: /openai-gpt-4/i });
    await user.click(openaiRadio);
    
    expect(openaiRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /claude-3.5/i })).not.toBeChecked();
  });

  it('displays all form labels correctly', () => {
    render(<AddNewAgent />);
    
    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('Select LLM Provider:')).toBeInTheDocument();
    expect(screen.getByText('Agent Engine:')).toBeInTheDocument();
    expect(screen.getByText('Initial State (optional):')).toBeInTheDocument();
  });

  it('renders create button with correct attributes', () => {
    render(<AddNewAgent />);
    
    const createButton = screen.getByRole('button', { name: /create agent/i });
    expect(createButton).toHaveAttribute('aria-label', 'create agent');
  });

  it('maintains form state across multiple interactions', async () => {
    const user = userEvent.setup();
    render(<AddNewAgent />);
    
    // Set agent name
    const nameInput = screen.getByTestId('agent-name');
    await user.type(nameInput, 'Multi-step Agent');
    
    // Select different LLM
    const geminiRadio = screen.getByRole('radio', { name: /gemini pro/i });
    await user.click(geminiRadio);
    
    // Update initial state
    const textarea = screen.getByLabelText(/initial state/i);
    await user.clear(textarea);
    await user.type(textarea, '{{"status": "active"}}');
    
    // Verify all states are maintained
    expect(nameInput).toHaveValue('Multi-step Agent');
    expect(geminiRadio).toBeChecked();
    expect(textarea).toHaveValue('{"status": "active"}');
  });
});