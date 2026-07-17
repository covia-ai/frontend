import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock heavy child components so this test stays focused on AssetList's own
// fetch-once / client-side-filter / clear-button logic (issue #184).
jest.mock('@/components/AssetCard', () => ({
  AssetCard: ({ asset }: any) => (
    <div data-testid="asset-card">{asset.metadata?.name ?? asset.id}</div>
  ),
}));
jest.mock('@/components/TagFilterDropdown', () => ({
  TagFilterDropdown: () => <div data-testid="tag-filter-dropdown" />,
}));
jest.mock('@/components/CreateAssetComponent', () => ({
  CreateAssetComponent: () => <div data-testid="create-asset" />,
}));
jest.mock('@/components/PaginationHeader', () => ({
  PaginationHeader: () => <div data-testid="pagination-header" />,
}));
jest.mock('@/components/admin-panel/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParam: string | null = null;
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/assets',
  useSearchParams: () => ({ get: (key: string) => (key === 'search' ? mockSearchParam : null) }),
}));

// venue-1's asset universe: a1/a2. listAssets() must be called exactly once
// per mount regardless of how much the user types afterward.
const mockVenue: any = {
  venueId: 'venue-1',
  metadata: { name: 'Test Venue' },
  listAssets: jest.fn(),
  getAsset: jest.fn(),
};

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
// Stable references across renders — a fresh object/function here would make
// `authData` change identity every render and infinite-loop the
// [venueObj, authMap, getAuthForVenue] fetch effect in AssetList.
const mockAuthMap = {};
const mockGetAuthForVenue = jest.fn().mockReturnValue({ type: 'keypair' });
jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: (selector: any) =>
    selector({ authMap: mockAuthMap, getAuthForVenue: mockGetAuthForVenue }),
}));
jest.mock('@/hooks/use-authenticated-venue', () => ({
  getVenueFor: () => mockVenue,
}));

import { AssetList } from '@/components/AssetList';

function makeAsset(id: string, name: string) {
  return {
    id,
    venue: mockVenue,
    metadata: { name, operation: undefined },
    getMetadata: jest.fn().mockResolvedValue({ name, operation: undefined }),
  };
}

describe('AssetList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Metadata is cached content-addressed in localStorage — clear it so each
    // test controls whether it exercises the fetch path or the cache path.
    window.localStorage.clear();
    mockSearchParam = null;
    mockVenue.listAssets.mockResolvedValue({ items: ['a1', 'a2'] });
    mockVenue.getAsset.mockImplementation((id: string) => {
      if (id === 'a1') return Promise.resolve(makeAsset('a1', 'Alpha Report'));
      if (id === 'a2') return Promise.resolve(makeAsset('a2', 'Beta Dataset'));
      return Promise.reject(new Error('unknown asset'));
    });
  });

  it('loads and displays all assets once, unfiltered', async () => {
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
  });

  it('serves metadata from the content-addressed cache on revisit — no per-asset GETs', async () => {
    window.localStorage.setItem('asset-meta:a1', JSON.stringify({ name: 'Alpha Report' }));
    window.localStorage.setItem('asset-meta:a2', JSON.stringify({ name: 'Beta Dataset' }));

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
    expect(mockVenue.getAsset).not.toHaveBeenCalled();
  });

  it('filters assets live as the user types, without refetching', async () => {
    const user = userEvent.setup();
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const input = screen.getByPlaceholderText('Type keyword to search…');
    await user.type(input, 'Alpha');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Alpha Report')).toBeInTheDocument();
    expect(screen.queryByText('Beta Dataset')).not.toBeInTheDocument();
    // Search is purely client-side now — typing must never trigger a second fetch.
    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
  });

  it('matches on asset id as well as name', async () => {
    const user = userEvent.setup();
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.type(screen.getByPlaceholderText('Type keyword to search…'), 'a2');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Beta Dataset')).toBeInTheDocument();
  });

  it('shows a clear button only once search text is entered, and resets on click', async () => {
    const user = userEvent.setup();
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText('Type keyword to search…');
    await user.type(input, 'Alpha');
    const clearButton = await screen.findByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(input).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledWith('/assets');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
  });

  it('seeds the search box from the ?search= URL param on load', () => {
    mockSearchParam = 'beta';
    render(<AssetList />);
    expect(screen.getByPlaceholderText('Type keyword to search…')).toHaveValue('beta');
  });
});
