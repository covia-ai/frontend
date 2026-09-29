import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// The picker lives inside operation forms. It must not touch the venue until
// opened, and once open it reads the catalog with metadata inlined
// (expand=metadata) — never one GET per asset.
const mockVenue: any = {
  venueId: 'venue-1',
  metadata: { name: 'Test Venue' },
  listAssets: jest.fn(),
  getAsset: jest.fn(),
};

jest.mock('@/hooks/use-authenticated-venue', () => ({
  ...require('@test/use-authenticated-venue').venueMock,
  useAuthenticatedVenue: () => mockVenue,
  getVenueFor: () => mockVenue,
}));
// The complete double: the listing resolves the account stored for the venue
// through the auth store, alongside the getAuthForVenue the picker uses.
jest.mock('@/hooks/use-auth', () => require('@test/use-auth').authMock);
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [mockVenue] }),
}));

import { AssetLookup } from '@/components/AssetLookup';

describe('AssetLookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.listAssets.mockResolvedValue({
      items: [
        { id: 'a1', metadata: { name: 'Alpha Report' } },
        { id: 'a2', metadata: { name: 'Beta Dataset' } },
      ],
    });
  });

  it('does not read the venue until the dialog is opened', () => {
    render(<AssetLookup sendAssetIdBackToForm={jest.fn()} />);
    expect(mockVenue.listAssets).not.toHaveBeenCalled();
  });

  it('lists the catalog from the expanded listing with no per-asset GETs', async () => {
    const user = userEvent.setup();
    render(<AssetLookup sendAssetIdBackToForm={jest.fn()} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getAllByTestId('asset-lookup-item')).toHaveLength(2));
    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
    expect(mockVenue.listAssets).toHaveBeenCalledWith({ expand: 'metadata' });
    expect(mockVenue.getAsset).not.toHaveBeenCalled();
  });

  it('filters the list client-side without refetching', async () => {
    const user = userEvent.setup();
    render(<AssetLookup sendAssetIdBackToForm={jest.fn()} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getAllByTestId('asset-lookup-item')).toHaveLength(2));

    await user.type(screen.getByRole('textbox'), 'beta');

    await waitFor(() => expect(screen.getAllByTestId('asset-lookup-item')).toHaveLength(1));
    expect(mockVenue.listAssets).toHaveBeenCalledTimes(1);
  });
});
