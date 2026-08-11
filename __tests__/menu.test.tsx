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

  // "Manage" only ever holds Secrets, which is auth-only — signed out, the
  // group has nothing left in it.
  it('shows the Manage group header when signed in', () => {
    render(<Menu isOpen={true} />);
    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('Secrets')).toBeInTheDocument();
  });

  it('hides the Manage group header entirely when signed out, instead of a bare label', () => {
    mockAuthenticated = false;
    render(<Menu isOpen={true} />);
    expect(screen.queryByText('Manage')).not.toBeInTheDocument();
    expect(screen.queryByText('Secrets')).not.toBeInTheDocument();
    // Groups with at least one surviving item still render normally.
    expect(screen.getByText('Build')).toBeInTheDocument();
  });
});
