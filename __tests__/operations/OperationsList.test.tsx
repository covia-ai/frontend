import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock heavy child components so this test stays focused on OperationsList's
// own fetch-once / client-side-filter / clear-button logic (issue #184).
// The list renders OperationCard (the operations-specific capability card);
// stub it to the same lightweight marker the assertions look for.
jest.mock('@/components/OperationCard', () => ({
  OperationCard: ({ asset }: any) => (
    <div data-testid="asset-card">{asset.metadata?.name ?? asset.id}</div>
  ),
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

jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue], addVenue: jest.fn() }),
}));
jest.mock('@/hooks/use-resolved-venue', () => ({
  useResolvedVenueContext: () => ({
    descriptor: mockVenue,
    venue: mockVenue,
    auth: { type: 'keypair' },
    isAuthenticated: true,
  }),
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

  // The search box lives directly in the toolbar now, not staged behind the
  // Filters sheet — it filters live as you type, no "Apply Filters" step.
  it('filters operations live as you type in the search box, without refetching', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.type(screen.getByPlaceholderText('Type keyword to search…'), 'Alpha');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Alpha Chat')).toBeInTheDocument();
    expect(screen.queryByText('Beta Fetch')).not.toBeInTheDocument();
    // Search is purely client-side — typing must never trigger a second fetch.
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

  it('clearing the search box resets to the full list and cleans up the URL', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const searchBox = screen.getByPlaceholderText('Type keyword to search…');
    await user.type(searchBox, 'Alpha');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));

    await user.clear(searchBox);

    expect(mockReplace).toHaveBeenCalledWith('/operations');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
  });

  it('seeds the search box from the ?search= URL param on load', async () => {
    mockSearchParam = 'beta';
    render(<OperationsList />);
    expect(await screen.findByPlaceholderText('Type keyword to search…')).toHaveValue('beta');
  });

  // Infinite scroll replaced the page-fit pagination: the first batch (24) is
  // shown up front, "Load more operations" appends the next batch, and "End of
  // results" marks the bottom once everything is visible. (IntersectionObserver
  // is unavailable under jsdom, so the manual button fallback is what drives
  // the grow here — exactly the path that keeps the list reachable without JS
  // observer support.)
  it('reveals operations a batch at a time via infinite scroll', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 30 }, (_, i) => ({
      path: `v/ops/demo/op${i}`,
      metadata: { name: `Op ${String(i).padStart(2, '0')}` },
    }));
    mockListCatalogOperations.mockResolvedValue(many);

    render(<OperationsList />);
    // First batch of 24 is shown; the rest wait behind "Load more".
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(24));
    expect(screen.getByRole('button', { name: /load more operations/i })).toBeInTheDocument();
    expect(screen.queryByText('End of results')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more operations/i }));

    // All 30 now shown, the button is gone, and the end marker appears.
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(30));
    expect(screen.queryByRole('button', { name: /load more operations/i })).not.toBeInTheDocument();
    expect(screen.getByText('End of results')).toBeInTheDocument();
    // Revealing more cards must never refetch the catalogue.
    expect(mockListCatalogOperations).toHaveBeenCalledTimes(1);
  });
});
