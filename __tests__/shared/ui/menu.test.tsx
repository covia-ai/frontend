import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

let mockAuthenticated = true;
let mockPathname = '/';
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => mockAuthenticated,
}));
jest.mock('@/hooks/use-hitl', () => ({
  useHitlOpenCount: () => 0,
}));
jest.mock('@/hooks/use-connection-count', () => ({
  useConnectionCount: () => 0,
}));
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import { Menu } from '@/components/admin-panel/menu';

describe('Menu — group headers', () => {
  afterEach(() => {
    mockAuthenticated = true;
    mockPathname = '/';
  });

  it('renders the requested navigation groups and entries when signed in', () => {
    render(<Menu isOpen={true} />);
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute('href', '/agents/create');
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/agents/view');
    expect(screen.getByRole('link', { name: /chat/i })).toHaveAttribute('href', '/agents/chat');
    expect(screen.getByRole('link', { name: /skills/i })).toHaveAttribute('href', '/agents/skills');
    expect(screen.getByRole('link', { name: /public artifacts/i })).toHaveAttribute('href', '/publicartifacts');
    expect(screen.getByRole('link', { name: /operations/i })).toHaveAttribute('href', '/operations');
    expect(screen.getByText('Secrets')).toBeInTheDocument();
  });

  it('hides authenticated entries while retaining non-empty groups', () => {
    mockAuthenticated = false;
    render(<Menu isOpen={true} />);
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.queryByText('Secrets')).not.toBeInTheDocument();
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Context')).not.toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
  });

  it('hides the Playground child and its expand toggle while signed out, even on its own route', () => {
    mockAuthenticated = false;
    mockPathname = '/operations/playground';
    render(<Menu isOpen={true} />);
    expect(screen.queryByRole('link', { name: /playground/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expand operations/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /operations/i })).toHaveAttribute('href', '/operations');
  });
});

describe('Menu — Operations submenu', () => {
  afterEach(() => {
    mockAuthenticated = true;
    mockPathname = '/';
  });

  it('keeps Operations collapsed with no visible children when not on an operations route', () => {
    render(<Menu isOpen={true} />);
    expect(screen.getByRole('link', { name: /operations/i })).toHaveAttribute('href', '/operations');
    expect(screen.queryByRole('link', { name: /playground/i })).not.toBeInTheDocument();
  });

  it('auto-expands Operations and highlights Playground when on its route', () => {
    mockPathname = '/operations/playground';
    render(<Menu isOpen={true} />);
    expect(screen.getByRole('link', { name: /playground/i })).toHaveAttribute('href', '/operations/playground');
  });

  it('expands Operations children on chevron click', async () => {
    const user = userEvent.setup();
    render(<Menu isOpen={true} />);
    expect(screen.queryByRole('link', { name: /playground/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /expand operations/i }));
    expect(screen.getByRole('link', { name: /playground/i })).toHaveAttribute('href', '/operations/playground');
  });

  it('does not render Operations children in icon-rail mode even on a child route', () => {
    mockPathname = '/operations/playground';
    render(<Menu isOpen={false} />);
    expect(screen.queryByRole('link', { name: /playground/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expand operations/i })).not.toBeInTheDocument();
  });
});
