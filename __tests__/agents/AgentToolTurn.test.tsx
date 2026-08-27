import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentToolTurn, AgentToolTurnGroup } from '@/components/AgentToolTurn';

describe('AgentToolTurn', () => {
  it('hides a successful result until expanded', async () => {
    render(<AgentToolTurn role="tool" tool={{ name: 'auth_whoami', text: '{"authenticated":true}', isError: false }} />);

    // Header is always shown; the JSON body is not, until asked for.
    expect(screen.getByTestId('tool-turn-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('tool-turn-body')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('tool-turn-toggle'));
    expect(screen.getByTestId('tool-turn-body')).toHaveTextContent('authenticated');

    await userEvent.click(screen.getByTestId('tool-turn-toggle'));
    expect(screen.queryByTestId('tool-turn-body')).not.toBeInTheDocument();
  });

  it('shows a failure by default — the one result you always want to see', () => {
    render(<AgentToolTurn role="tool" tool={{ name: 'grid_run', text: 'Error: Capability denied', isError: true }} />);
    expect(screen.getByTestId('tool-turn-body')).toHaveTextContent('Capability denied');
  });

  it('keeps the timestamp inside the expander, not on the collapsed row', async () => {
    render(<AgentToolTurn role="tool" tool={{ name: 'auth_whoami', text: 'x', isError: false }} ts={1700000000000} />);
    // Collapsed: no timestamp on show.
    expect(screen.queryByTestId('tool-turn-time')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('tool-turn-toggle'));
    expect(screen.getByTestId('tool-turn-time')).toBeInTheDocument();
  });

  it('renders the tool name verbatim, not upper-cased', () => {
    render(<AgentToolTurn role="tool" tool={{ name: 'auth_whoami', text: 'x', isError: false }} />);
    // The label must read "tool · auth_whoami", not "AUTH_WHOAMI" — it's a code id.
    const toggle = screen.getByTestId('tool-turn-toggle');
    expect(toggle).toHaveTextContent('tool · auth_whoami');
    expect(toggle.className).not.toMatch(/uppercase/);
  });
});

describe('AgentToolTurnGroup', () => {
  const turns = [
    { role: 'tool', tool: { name: 'skill_load', text: 'ok', isError: false } },
    { role: 'tool', tool: { name: 'covia_list', text: 'ok', isError: false } },
    { role: 'tool', tool: { name: 'covia_list', text: 'ok', isError: false } },
  ];

  it('shows only the first call and a "+N more" toggle for the rest', () => {
    render(<AgentToolTurnGroup turns={turns} />);
    expect(screen.getByText('tool · skill_load')).toBeInTheDocument();
    expect(screen.queryAllByText('tool · covia_list')).toHaveLength(0);
    expect(screen.getByTestId('tool-group-toggle')).toHaveTextContent('+2 more tool calls');
  });

  it('reveals the rest on click, and collapses them again on a second click', async () => {
    render(<AgentToolTurnGroup turns={turns} />);
    await userEvent.click(screen.getByTestId('tool-group-toggle'));
    expect(screen.getAllByText('tool · covia_list')).toHaveLength(2);
    expect(screen.getByTestId('tool-group-toggle')).toHaveTextContent('Show less');

    await userEvent.click(screen.getByTestId('tool-group-toggle'));
    expect(screen.queryAllByText('tool · covia_list')).toHaveLength(0);
  });

  it('renders a single-call group with no toggle', () => {
    render(<AgentToolTurnGroup turns={[turns[0]]} />);
    expect(screen.getByText('tool · skill_load')).toBeInTheDocument();
    expect(screen.queryByTestId('tool-group-toggle')).not.toBeInTheDocument();
  });
});
