import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('json-edit-react', () => ({
  JsonEditor: ({ data }: { data: unknown }) => (
    <pre data-testid="workspace-json-content">{JSON.stringify(data)}</pre>
  ),
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

  it('keeps namespaces visible beside a keys-only Workspace listing', async () => {
    render(<WorkspaceExplorer />);

    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('w'));
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
    expect(screen.getByTestId('workspace-namespace-pane')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Workspace namespaces' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Workspace w$/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('workspace-content-pane')).toBeInTheDocument();
    for (const call of mockVenue.workspace.list.mock.calls) {
      expect(call[0]).toBeTruthy();
    }
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });

  it('shows the virtual venue namespace and presents its empty listing without a full read', async () => {
    render(<WorkspaceExplorer />);

    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('w'));
    const venuePublic = screen.getByRole('button', { name: /^Venue v$/ });
    fireEvent.click(venuePublic);
    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('v'));

    expect(await screen.findByText('This namespace is empty')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-namespace-description')).toHaveTextContent(
      'Operations, agent templates, skills, tests, and public information supplied by this venue.',
    );
    expect(screen.queryByText('Path does not exist')).not.toBeInTheDocument();
    expect(screen.queryByText('object')).not.toBeInTheDocument();
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Resync listing' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-namespace-pane')).toBeInTheDocument();
  });

  it('keeps keys in the middle and renders selected content only in the inspector', async () => {
    mockVenue.workspace.list.mockImplementation((path: string) => Promise.resolve({
      exists: true,
      keys: path === 'w' ? ['document'] : [],
    }));
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: { title: 'A document', body: 'Inspector content' },
      type: 'object',
    });
    render(<WorkspaceExplorer />);

    fireEvent.click(await screen.findByText('document'));
    await waitFor(() => expect(mockVenue.workspace.read).toHaveBeenCalledWith('w/document'));

    const contentPane = screen.getByTestId('workspace-content-pane');
    expect(await within(contentPane).findByText('w/document')).toBeInTheDocument();
    expect(within(contentPane).getByTestId('workspace-json-content')).toHaveTextContent(
      'Inspector content',
    );
    expect(within(screen.getByTestId('workspace-namespace-pane')).queryByText('document')).not.toBeInTheDocument();
  });

  it('deep-links to a given initialPath instead of the w default', async () => {
    render(<WorkspaceExplorer initialPath="v/skills" />);

    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('v/skills'));
    expect(mockVenue.workspace.list).not.toHaveBeenCalledWith('w');
  });

  it('shows the shared-venue read-only banner only while browsing v/, not w/', async () => {
    render(<WorkspaceExplorer />);
    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('w'));
    expect(screen.queryByTestId('workspace-shared-venue-banner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Venue v$/ }));
    await waitFor(() => expect(mockVenue.workspace.list).toHaveBeenCalledWith('v'));

    expect(await screen.findByTestId('workspace-shared-venue-banner')).toHaveTextContent(
      'Shared with everyone on',
    );
  });
});
