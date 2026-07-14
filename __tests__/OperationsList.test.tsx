import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock heavy child components so this test stays focused on OperationsList's
// own fetch-once / client-side-filter / clear-button logic (issue #184).
jest.mock('@/components/AssetCard', () => ({
  AssetCard: ({ asset }: any) => (
    <div data-testid="asset-card">{asset.metadata?.name ?? asset.id}</div>
  ),
}));
jest.mock('@/components/TagFilterDropdown', () => ({
  TagFilterDropdown: () => <div data-testid="tag-filter-dropdown" />,
}));
jest.mock('@/components/PaginationHeader', () => ({
  PaginationHeader: () => <div data-testid="pagination-header" />,
}));
jest.mock('@/components/admin-panel/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

// listCatalogOperations always fetches the full catalog — mocked directly so
// the test controls it without needing a real venue's workspace reads.
const mockListCatalogOperations = jest.fn();
jest.mock('@/lib/operations-catalog', () => ({
  listCatalogOperations: (...args: any[]) => mockListCatalogOperations(...args),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParam: string | null = null;
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/operations',
  useSearchParams: () => ({ get: (key: string) => (key === 'search' ? mockSearchParam : null) }),
}));

const mockVenue: any = { venueId: 'venue-1', metadata: { name: 'Test Venue' } };

// Minimal store-api shape real zustand's useStore(api, selector) requires:
// getState + subscribe + getInitialState (see node_modules/zustand/react.js).
const mockVenueStoreApi = {
  getState: () => ({ currentVenue: mockVenue, getCurrentVenue: () => mockVenue }),
  getInitialState: () => ({ currentVenue: mockVenue, getCurrentVenue: () => mockVenue }),
  subscribe: () => () => {},
};
jest.mock('@/hooks/use-venue', () => ({ useVenue: mockVenueStoreApi }));
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue], addVenue: jest.fn() }),
}));
// Stable references across renders — fresh objects/functions here would
// change identity every render and infinite-loop the
// [venueObj, authMap, getAuthForVenue] fetch effect in OperationsList.
const mockAuthMap = {};
const mockGetAuthForVenue = jest.fn().mockReturnValue({ type: 'keypair' });
jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: (selector: any) =>
    selector({ authMap: mockAuthMap, getAuthForVenue: mockGetAuthForVenue }),
}));
jest.mock('@/hooks/use-authenticated-venue', () => ({
  getVenueFor: () => mockVenue,
}));

import { OperationsList } from '@/components/OperationsList';

describe('OperationsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParam = null;
    mockListCatalogOperations.mockResolvedValue([
      { path: 'v/ops/llmagent/chat', metadata: { name: 'Alpha Chat' } },
      { path: 'v/ops/http/fetch', metadata: { name: 'Beta Fetch' } },
    ]);
  });

  it('loads and displays all operations once, unfiltered', async () => {
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(mockListCatalogOperations).toHaveBeenCalledTimes(1);
  });

  it('filters operations live as the user types, without refetching', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const input = screen.getByPlaceholderText('Type keyword to search…');
    await user.type(input, 'Alpha');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Alpha Chat')).toBeInTheDocument();
    expect(screen.queryByText('Beta Fetch')).not.toBeInTheDocument();
    // Search is purely client-side now — typing must never trigger a second fetch.
    expect(mockListCatalogOperations).toHaveBeenCalledTimes(1);
  });

  it('matches on operation path as well as name', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.type(screen.getByPlaceholderText('Type keyword to search…'), 'http/fetch');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Beta Fetch')).toBeInTheDocument();
  });

  it('shows a clear button only once search text is entered, and resets on click', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText('Type keyword to search…');
    await user.type(input, 'Alpha');
    const clearButton = await screen.findByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(input).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledWith('/operations');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
  });

  it('seeds the search box from the ?search= URL param on load', () => {
    mockSearchParam = 'beta';
    render(<OperationsList />);
    expect(screen.getByPlaceholderText('Type keyword to search…')).toHaveValue('beta');
  });
});
