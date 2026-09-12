import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Focused on the facet row + Filters sheet: the "All" pill carries the
// catalogue total (like every adapter pill carries its count) and the sheet's
// adapter rows wear the same glyph as their pill, while free-form keyword rows
// stay icon-less. Heavy children are stubbed so only that surface is exercised.
jest.mock('@/components/OperationCard', () => ({
  OperationCard: ({ asset }: any) => (
    <div data-testid="asset-card">{asset.metadata?.name ?? asset.id}</div>
  ),
}));
jest.mock('@/components/PaginationHeader', () => ({
  PaginationHeader: () => <div data-testid="pagination-header" />,
}));
jest.mock('@/components/admin-panel/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

const mockListCatalogOperations = jest.fn();
jest.mock('@/lib/operations-catalog', () => ({
  listCatalogOperations: (...args: any[]) => mockListCatalogOperations(...args),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/operations',
  useSearchParams: () => ({ get: () => null }),
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

describe('OperationsList — facets & filter sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Two adapters (langchain, http) + one free-form keyword (memory) so the
    // facet row renders and the sheet splits into Adapter/Keyword sections.
    mockListCatalogOperations.mockResolvedValue([
      { path: 'v/ops/langchain/chat', metadata: { name: 'Alpha Chat', operation: { adapter: 'langchain:openai' }, keywords: ['memory'] } },
      { path: 'v/ops/http/fetch', metadata: { name: 'Beta Fetch', operation: { adapter: 'http:get' } } },
    ]);
  });

  it('shows the catalogue total on the "All" pill', async () => {
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    const facets = screen.getByTestId('operation-facets');
    const allPill = within(facets).getByRole('button', { name: /All/ });
    expect(allPill).toHaveTextContent('2');
  });

  it('renders an icon on adapter rows in the filter sheet, but not on keyword rows', async () => {
    const user = userEvent.setup();
    render(<OperationsList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.click(screen.getByTestId('filters-trigger'));
    const sheet = await screen.findByTestId('filters-sheet');

    // Adapter rows carry a glyph (an <svg>); the unchecked checkbox renders no
    // svg of its own, so any svg in the row is the adapter icon.
    const adapterRow = within(sheet).getByText('langchain').closest('label')!;
    expect(adapterRow.querySelector('svg')).toBeTruthy();

    // Free-form keyword rows stay icon-less.
    const keywordRow = within(sheet).getByText('memory').closest('label')!;
    expect(keywordRow.querySelector('svg')).toBeFalsy();
  });
});
