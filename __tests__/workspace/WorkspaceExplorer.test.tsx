import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    list: jest.fn().mockResolvedValue({ exists: true, keys: ['v'] }),
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
  it('requests the root listing as "/" — an empty path would route to the job-minting invoke fallback', async () => {
    render(<WorkspaceExplorer />);

    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalled());
    // Every list call must carry a non-empty path; the mount (root) call is "/".
    expect(mockVenue.workspace.list).toHaveBeenCalledWith('/');
    for (const call of mockVenue.workspace.list.mock.calls) {
      expect(call[0]).toBeTruthy();
    }
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });

  it('shows the virtual venue namespace and presents an unmaterialised root as empty', async () => {
    render(<WorkspaceExplorer />);

    expect(await screen.findAllByText('Venue Public')).not.toHaveLength(0);
    await waitFor(() => expect(mockVenue.workspace.read).toHaveBeenCalledWith('v'));
    expect(screen.getByText('This namespace is empty')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-namespace-description')).toHaveTextContent(
      'Operations, agent templates, skills, tests, and public information supplied by this venue.',
    );
    expect(screen.queryByText('Path does not exist')).not.toBeInTheDocument();
    expect(screen.queryByText('object')).not.toBeInTheDocument();
  });
});
