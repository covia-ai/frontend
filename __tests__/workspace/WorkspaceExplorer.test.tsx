import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('json-edit-react', () => ({
  JsonEditor: () => null,
  githubDarkTheme: {},
  githubLightTheme: {},
}));
jest.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light' }) }));

const mockVenue: any = {
  venueId: 'venue-1',
  workspace: {
    list: jest.fn().mockImplementation((path: string) => Promise.resolve({
      exists: true,
      keys: path === '/' ? [] : [],
    })),
    read: jest.fn().mockResolvedValue({ exists: false, value: null, type: 'object' }),
  },
  operations: { run: jest.fn() },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => false,
}));

import { WorkspaceExplorer } from '@/components/WorkspaceExplorer';

describe('WorkspaceExplorer job-free reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with a keys-only Workspace listing, then requests root as "/"', async () => {
    render(<WorkspaceExplorer />);

    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('w'));
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Workspace root' }));
    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('/'));
    expect(mockVenue.workspace.list).toHaveBeenCalledWith('/');
    for (const call of mockVenue.workspace.list.mock.calls) {
      expect(call[0]).toBeTruthy();
    }
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });

  it('shows the virtual venue namespace and presents its empty listing without a full read', async () => {
    render(<WorkspaceExplorer />);

    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('w'));
    fireEvent.click(screen.getByRole('button', { name: 'Workspace root' }));
    const venuePublic = await screen.findByText('Venue Public');
    fireEvent.click(venuePublic);
    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('v'));

    expect(await screen.findByText('This namespace is empty')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-namespace-description')).toHaveTextContent(
      'Operations, agent templates, skills, tests, and public information supplied by this venue.',
    );
    expect(screen.queryByText('Path does not exist')).not.toBeInTheDocument();
    expect(screen.queryByText('object')).not.toBeInTheDocument();
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Resync Venue Public' })).toBeInTheDocument();
  });
});
