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

let mockAuthenticated = true;
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue], addVenue: jest.fn() }),
}));
jest.mock('@/hooks/use-resolved-venue', () => ({
  useResolvedVenueContext: () => ({
    descriptor: mockVenue,
    venue: mockVenue,
    auth: { type: 'keypair' },
    isAuthenticated: mockAuthenticated,
  }),
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
    mockAuthenticated = true;
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

  it('shows the Create Asset button when signed in', async () => {
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(screen.getByTestId('create-asset')).toBeInTheDocument();
  });

  it('hides the Create Asset button entirely when signed out', async () => {
    mockAuthenticated = false;
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(screen.queryByTestId('create-asset')).not.toBeInTheDocument();
  });

  it('serves metadata from the content-addressed cache on revisit — no per-asset GETs', async () => {
    window.localStorage.setItem('asset-meta:a1', JSON.stringify({ name: 'Alpha Report' }));
    window.localStorage.setItem('asset-meta:a2', JSON.stringify({ name: 'Beta Dataset' }));

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
    expect(mockVenue.getAsset).not.toHaveBeenCalled();
  });

  // The search box lives directly in the toolbar now, not staged behind the
  // Filters sheet — it filters live as you type, no "Apply Filters" step.
  it('filters assets live as you type in the search box, without refetching', async () => {
    const user = userEvent.setup();
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.type(screen.getByPlaceholderText('Type keyword to search…'), 'Alpha');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Alpha Report')).toBeInTheDocument();
    expect(screen.queryByText('Beta Dataset')).not.toBeInTheDocument();
    // Search is purely client-side — typing must never trigger a second fetch.
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

  it('clearing the search box resets to the full list and cleans up the URL', async () => {
    const user = userEvent.setup();
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const searchBox = screen.getByPlaceholderText('Type keyword to search…');
    await user.type(searchBox, 'Alpha');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));

    await user.clear(searchBox);

    expect(mockReplace).toHaveBeenCalledWith('/assets');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
  });

  it('seeds the search box from the ?search= URL param on load', async () => {
    mockSearchParam = 'beta';
    render(<AssetList />);
    expect(await screen.findByPlaceholderText('Type keyword to search…')).toHaveValue('beta');
  });

  // venue.listAssets() is a hash-only CAS scan with no path field. Catalog
  // content (agent templates, skills) resolved through it would only ever
  // be addressable as a bare /a/<hash>, misdisplaying it as the caller's own
  // pinned asset (covia#390) instead of its real venue-catalog identity —
  // those kinds have their own path-first views, so they're excluded here.
  it('excludes agent templates and skills — catalog content with no path in this hash-only listing', async () => {
    mockVenue.listAssets.mockResolvedValue({ items: ['a1', 'a2', 'a3', 'a4'] });
    mockVenue.getAsset.mockImplementation((id: string) => {
      if (id === 'a1') return Promise.resolve(makeAsset('a1', 'Alpha Report'));
      if (id === 'a2') return Promise.resolve(makeAsset('a2', 'Beta Dataset'));
      if (id === 'a3') {
        return Promise.resolve({
          id,
          venue: mockVenue,
          metadata: { name: 'Skilled Template', agent: { config: {} } },
        });
      }
      if (id === 'a4') {
        return Promise.resolve({
          id,
          venue: mockVenue,
          metadata: { name: 'Research Skill', skill: { tools: ['search'] } },
        });
      }
      return Promise.reject(new Error('unknown asset'));
    });

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(screen.getByText('Alpha Report')).toBeInTheDocument();
    expect(screen.getByText('Beta Dataset')).toBeInTheDocument();
    expect(screen.queryByText('Skilled Template')).not.toBeInTheDocument();
    expect(screen.queryByText('Research Skill')).not.toBeInTheDocument();
  });
});
