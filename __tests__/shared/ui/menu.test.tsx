import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockAuthenticated = true;
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => mockAuthenticated,
}));
jest.mock('@/hooks/use-hitl', () => ({
  useHitlOpenCount: () => 0,
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import { Menu } from '@/components/admin-panel/menu';

describe('Menu — group headers', () => {
  afterEach(() => { mockAuthenticated = true; });

  it('renders the requested navigation groups and entries when signed in', () => {
    render(<Menu isOpen={true} />);
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute('href', '/agents/create');
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/agents/view');
    expect(screen.getByRole('link', { name: /chat/i })).toHaveAttribute('href', '/agents/explorer');
    expect(screen.getByRole('link', { name: /assets/i })).toHaveAttribute('href', '/publicartifacts');
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
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
  });
});
