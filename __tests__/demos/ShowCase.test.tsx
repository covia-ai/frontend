import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/AssetCard', () => ({
  AssetCard: ({ asset }: any) => <div data-testid="asset-card">{asset.metadata?.name}</div>,
}));

// Featured items come from the operations catalog (two workspace.read calls),
// NOT from hydrating the venue's whole asset store one getAsset at a time.
const featuredOp = { name: 'Echo', operation: { adapter: 'test:echo', info: { featured: true } } };
const plainOp = { name: 'Plain', operation: { adapter: 'test:plain' } };

const mockVenue: any = {
  venueId: 'venue-1',
  metadata: { name: 'Test Venue' },
  workspace: {
    read: jest.fn((path: string) =>
      Promise.resolve(path === 'v/ops'
        ? { exists: true, value: { test: { echo: featuredOp, plain: plainOp } } }
        : { exists: false })),
  },
  listAssets: jest.fn(),
  getAsset: jest.fn(),
};

jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue] }),
}));

import { ShowCase } from '@/components/ShowCase';

describe('ShowCase', () => {
  it('renders featured operations from the catalog without touching the asset store', async () => {
    render(<ShowCase />);

    expect(await screen.findByText('Echo')).toBeInTheDocument();
    expect(screen.queryByText('Plain')).not.toBeInTheDocument();

    expect(mockVenue.listAssets).not.toHaveBeenCalled();
    expect(mockVenue.getAsset).not.toHaveBeenCalled();
  });
});
