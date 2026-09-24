import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { usePinnedAssets } from '@/hooks/use-pinned-assets';

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

describe('AssetList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParam = null;
    mockAuthenticated = true;
    act(() => usePinnedAssets.setState({ pinned: [] }));
    mockVenue.listAssets.mockResolvedValue({
      items: [
        { id: 'a1', metadata: { name: 'Alpha Report' } },
        { id: 'a2', metadata: { name: 'Beta Dataset' } },
      ],
      total: 2,
      offset: 0,
      limit: 1000,
    });
  });

  it('loads and displays all assets once, unfiltered, with metadata inlined via expand', async () => {
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
    expect(mockVenue.listAssets).toHaveBeenCalledWith({ expand: 'metadata', offset: 0, limit: 1000 });
  });

  it('reveals assets a batch at a time (infinite scroll); Load more grows the window', async () => {
    const user = userEvent.setup();
    // 30 > one batch (24); jsdom has no IntersectionObserver, so the manual
    // "Load more" fallback drives the grow.
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `x${i}`, metadata: { name: `Asset ${i}` } }));
    mockVenue.listAssets.mockResolvedValue({ items, total: items.length, offset: 0, limit: 1000 });

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(24));

    await user.click(screen.getByRole('button', { name: /load more assets/i }));
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(30));

    expect(screen.queryByRole('button', { name: /load more assets/i })).not.toBeInTheDocument();
    expect(screen.getByText('End of results')).toBeInTheDocument();
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

  it('never fetches per-asset metadata — expand: metadata returns it inline', async () => {
    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
    expect(mockVenue.getAsset).toBeUndefined();
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
    mockVenue.listAssets.mockResolvedValue({
      items: [
        { id: 'a1', metadata: { name: 'Alpha Report' } },
        { id: 'a2', metadata: { name: 'Beta Dataset' } },
        { id: 'a3', metadata: { name: 'Skilled Template', agent: { config: {} } } },
        { id: 'a4', metadata: { name: 'Research Skill', skill: { tools: ['search'] } } },
      ],
      total: 4,
      offset: 0,
      limit: 1000,
    });

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(screen.getByText('Alpha Report')).toBeInTheDocument();
    expect(screen.getByText('Beta Dataset')).toBeInTheDocument();
    expect(screen.queryByText('Skilled Template')).not.toBeInTheDocument();
    expect(screen.queryByText('Research Skill')).not.toBeInTheDocument();
  });

  it('surfaces a pinned asset ahead of unpinned ones, scoped to the current venue', async () => {
    act(() => usePinnedAssets.getState().pin(mockVenue.venueId, 'a2'));

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const names = screen.getAllByTestId('asset-card').map((el) => el.textContent);
    expect(names).toEqual(['Beta Dataset', 'Alpha Report']);
  });

  it('ignores pins recorded against a different venue', async () => {
    act(() => usePinnedAssets.getState().pin('some-other-venue', 'a2'));

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const names = screen.getAllByTestId('asset-card').map((el) => el.textContent);
    expect(names).toEqual(['Alpha Report', 'Beta Dataset']);
  });
});

// The venue caps a limit-less listing at 1000 and reports the true size in
// `total`. Reading once meant a larger catalogue was silently truncated and the
// grid declared "End of results" over assets it had never asked for (#420).
describe('AssetList catalogue paging', () => {
  const page = (from: number, count: number, total: number) => ({
    items: Array.from({ length: count }, (_, i) => ({
      id: `x${from + i}`,
      metadata: { name: `Asset ${from + i}` },
    })),
    total,
    offset: from,
    limit: 1000,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParam = null;
    mockAuthenticated = true;
    act(() => usePinnedAssets.setState({ pinned: [] }));
  });

  it('reads a catalogue that fits in one page with exactly one request', async () => {
    mockVenue.listAssets.mockResolvedValue(page(0, 2, 2));

    render(<AssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
  });

  it('keeps paging past the server cap instead of stopping at the first page', async () => {
    mockVenue.listAssets
      .mockResolvedValueOnce(page(0, 1000, 1200))
      .mockResolvedValueOnce(page(1000, 200, 1200));

    render(<AssetList />);

    await waitFor(() => expect(mockVenue.listAssets).toHaveBeenCalledTimes(2));
    expect(mockVenue.listAssets).toHaveBeenNthCalledWith(1, { expand: 'metadata', offset: 0, limit: 1000 });
    expect(mockVenue.listAssets).toHaveBeenNthCalledWith(2, { expand: 'metadata', offset: 1000, limit: 1000 });

    // An asset from beyond the cap is reachable, which is the whole point.
    await waitFor(() => expect(screen.getByText(/Showing 24 of 1200/)).toBeInTheDocument());
  });

  it('does not claim "End of results" while later pages are still coming', async () => {
    // A short first page: every card it yields is already on screen, so the
    // grid has nothing left to reveal — but the catalogue is not exhausted.
    // That is exactly when "End of results" would be a lie.
    let releaseSecond: (v: unknown) => void = () => {};
    mockVenue.listAssets
      .mockResolvedValueOnce(page(0, 5, 1200))
      .mockReturnValueOnce(new Promise((resolve) => { releaseSecond = resolve; }));

    render(<AssetList />);

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(5));
    expect(screen.queryByText('End of results')).not.toBeInTheDocument();
    expect(screen.getByText(/Loading more assets/i)).toBeInTheDocument();

    await act(async () => { releaseSecond(page(5, 3, 8)); });
    await waitFor(() => expect(screen.queryByText(/Loading more assets/i)).not.toBeInTheDocument());
    expect(screen.getByText('End of results')).toBeInTheDocument();
  });

  it('stops on an empty page rather than spinning on a bad total', async () => {
    mockVenue.listAssets
      .mockResolvedValueOnce(page(0, 2, 99))
      .mockResolvedValueOnce({ items: [], total: 99, offset: 2, limit: 1000 });

    render(<AssetList />);

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(mockVenue.listAssets).toHaveBeenCalledTimes(2);
  });
});
