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

  it('filters operations once a search is applied from the Filters sheet, without refetching', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.click(screen.getByTestId('filters-trigger'));
    await user.type(await screen.findByPlaceholderText('Type keyword to search…'), 'Alpha');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Alpha Chat')).toBeInTheDocument();
    expect(screen.queryByText('Beta Fetch')).not.toBeInTheDocument();
    // Search is purely client-side now — applying it must never trigger a second fetch.
    expect(mockListCatalogOperations).toHaveBeenCalledTimes(1);
  });

  it('matches on operation path as well as name', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.click(screen.getByTestId('filters-trigger'));
    await user.type(await screen.findByPlaceholderText('Type keyword to search…'), 'http/fetch');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('Beta Fetch')).toBeInTheDocument();
  });

  it('resets search via Clear All in the Filters sheet', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.click(screen.getByTestId('filters-trigger'));
    await user.type(await screen.findByPlaceholderText('Type keyword to search…'), 'Alpha');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));

    await user.click(screen.getByTestId('filters-trigger'));
    await user.click(await screen.findByRole('button', { name: /clear all/i }));

    expect(mockReplace).toHaveBeenCalledWith('/operations');
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
  });

  it('seeds the search box from the ?search= URL param on load', async () => {
    mockSearchParam = 'beta';
    const user = userEvent.setup();
    render(<OperationsList />);
    await user.click(screen.getByTestId('filters-trigger'));
    expect(await screen.findByPlaceholderText('Type keyword to search…')).toHaveValue('beta');
  });
});
