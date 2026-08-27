import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const globalVenue = {
  venueId: 'did:web:global.example',
  metadata: { name: 'Global' },
  jobs: { cancel: jest.fn() },
};
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => globalVenue,
}));
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => true,
}));
jest.mock('@/components/AssetInfoSheet', () => ({
  AssetInfoSheet: () => null,
}));
jest.mock('@/lib/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
  gtmEvent: { buttonClick: jest.fn() },
}));

import { AssetCard } from '@/components/AssetCard';
import { ExecutionToolbar } from '@/components/ExecutionToolbar';

describe('route venue context', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the supplied venue when navigating from a route-scoped asset card', () => {
    const routeVenue = {
      venueId: 'did:web:route.example',
      metadata: { name: 'Route' },
    } as any;
    const asset = {
      id: 'v/ops/test/echo',
      metadata: { name: 'Echo', operation: { adapter: 'test:echo' } },
    } as any;

    render(<AssetCard asset={asset} type="operations" compact venue={routeVenue} />);
    fireEvent.click(screen.getByTestId('asset-header'));

    expect(mockPush).toHaveBeenCalledWith(
      '/venues/did%3Aweb%3Aroute.example/operations/v/ops/test/echo',
    );
  });

  it('uses the supplied venue for job mutations', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    const routeVenue = {
      venueId: 'did:web:route.example',
      jobs: { cancel },
    } as any;

    render(
      <ExecutionToolbar
        jobData={{ id: '0x123', status: 'STARTED' } as any}
        venue={routeVenue}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith('0x123'));
    expect(globalVenue.jobs.cancel).not.toHaveBeenCalled();
  });
});
