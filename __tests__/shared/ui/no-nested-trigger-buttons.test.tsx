import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Regression for the hydration error "<button> cannot be a descendant of
// <button>": composed Radix triggers (Tooltip + Sheet/Dialog/AlertDialog)
// must chain onto ONE real button via asChild, never nest their own.

jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({ venues: [], removeVenue: jest.fn() }),
}));
const mockVenue: any = { venueId: 'venue-1', metadata: { name: 'V' } };
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { AssetInfoSheet } from '@/components/AssetInfoSheet';
import { RemoveVenueModal } from '@/components/RemoveVenueModal';
import { ExecutionToolbar } from '@/components/ExecutionToolbar';
import { SmartBreadcrumb } from '@/components/smartbreadcrumb2';

const opAsset: any = {
  id: 'v/ops/test/echo',
  metadata: { name: 'Echo', operation: { adapter: 'test:echo' } },
};

function expectNoNestedButtons(container: HTMLElement) {
  expect(container.querySelector('button button')).toBeNull();
}

describe('no nested trigger buttons', () => {
  it('AssetInfoSheet: sheet trigger + tooltip share one button', () => {
    const { container } = render(<AssetInfoSheet asset={opAsset} venueId="did:key:z6Mk" />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    expectNoNestedButtons(container);
  });

  it('RemoveVenueModal: alert-dialog trigger + tooltip share one button', () => {
    const { container } = render(<RemoveVenueModal venueId="venue-1" />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    expectNoNestedButtons(container);
  });

  it('ExecutionToolbar (active job): cancel/pause triggers hold one button each', () => {
    const { container } = render(<ExecutionToolbar jobData={{ id: '0x1', status: 'STARTED' } as any} />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    expectNoNestedButtons(container);
  });

  it('ExecutionToolbar (finished job): delete trigger holds one button', () => {
    const { container } = render(<ExecutionToolbar jobData={{ id: '0x1', status: 'COMPLETE' } as any} />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    expectNoNestedButtons(container);
  });

  it('SmartBreadcrumb: separators are siblings of items, never nested li-in-li', () => {
    // Short path (flat) and long path (collapsed dropdown) exercise all
    // three separator render sites.
    for (const pathname of ['/agents', '/venues/v-1/operations/op-1/details/deep']) {
      const { container, unmount } = render(<SmartBreadcrumb pathname={pathname} />);
      expect(container.querySelectorAll('li').length).toBeGreaterThan(1);
      expect(container.querySelector('li li')).toBeNull();
      unmount();
    }
  });
});
