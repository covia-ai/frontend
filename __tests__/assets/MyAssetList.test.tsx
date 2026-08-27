import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock heavy child components so this test stays focused on MyAssetList's
// own fetch / client-side-filter logic, mirroring AssetList.test.tsx.
jest.mock('@/components/AssetCard', () => ({
  AssetCard: ({ asset }: any) => (
    <div data-testid="asset-card">{asset.metadata?.name ?? asset.id}</div>
  ),
}));
jest.mock('@/components/PaginationHeader', () => ({
  PaginationHeader: () => <div data-testid="pagination-header" />,
}));

const mockVenue: any = {
  venueId: 'venue-1',
  metadata: { name: 'Test Venue' },
  assets: {
    listMine: jest.fn(),
  },
};

jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue], addVenue: jest.fn() }),
}));
jest.mock('@/hooks/use-resolved-venue', () => ({
  useResolvedVenueContext: () => ({
    descriptor: mockVenue,
    venue: mockVenue,
    auth: { type: 'keypair' },
    isAuthenticated: true,
    status: 'ready',
    error: null,
  }),
}));

import { MyAssetList } from '@/components/MyAssetList';

describe('MyAssetList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.assets.listMine.mockResolvedValue({
      items: [
        { id: 'm1', name: 'My First Doc', type: 'document', description: 'x' },
        { id: 'm2', name: 'My Second Doc', type: 'document', description: 'y' },
      ],
      total: 2,
      offset: 0,
      limit: 1000,
    });
  });

  it('fetches and displays the caller\'s own assets once', async () => {
    render(<MyAssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));
    expect(mockVenue.assets.listMine).toHaveBeenCalledTimes(1);
    expect(screen.getByText('My First Doc')).toBeInTheDocument();
    expect(screen.getByText('My Second Doc')).toBeInTheDocument();
  });

  it('shows an empty state when the caller owns nothing', async () => {
    mockVenue.assets.listMine.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 1000 });
    render(<MyAssetList />);
    await waitFor(() =>
      expect(screen.getByText("You haven't created or pinned any assets yet.")).toBeInTheDocument(),
    );
  });

  it('filters live as you type in the search box, without refetching', async () => {
    const user = userEvent.setup();
    render(<MyAssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.type(screen.getByPlaceholderText('Type keyword to search…'), 'First');

    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(1));
    expect(screen.getByText('My First Doc')).toBeInTheDocument();
    expect(screen.queryByText('My Second Doc')).not.toBeInTheDocument();
    expect(mockVenue.assets.listMine).toHaveBeenCalledTimes(1);
  });

  it('shows a no-match message distinct from the empty-owner state', async () => {
    const user = userEvent.setup();
    render(<MyAssetList />);
    await waitFor(() => expect(screen.getAllByTestId('asset-card')).toHaveLength(2));

    await user.type(screen.getByPlaceholderText('Type keyword to search…'), 'nonexistent');

    await waitFor(() =>
      expect(screen.getByText('No artifacts match this search.')).toBeInTheDocument(),
    );
  });
});
