import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { AccountsPanel } from '@/components/AccountsPanel';
import { useAuthStore } from '@/hooks/use-auth';
import { useVenues } from '@/hooks/use-venues';

const VENUE_A = 'did:web:venue-a.example.com';
const VENUE_B = 'did:web:venue-b.example.com';
const descriptor = (venueId: string, name: string) => ({
  venueId,
  baseUrl: `https://${name}.example.com`,
  metadata: { name },
});

describe('AccountsPanel', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null });
      useVenues.setState({
        venues: [descriptor(VENUE_A, 'Alpha'), descriptor(VENUE_B, 'Beta')],
        selectedVenueId: VENUE_A,
      });
    });
  });

  it('shows an empty state when no accounts exist anywhere', () => {
    render(<AccountsPanel />);
    expect(screen.getByTestId('accounts-empty')).toBeInTheDocument();
    expect(screen.queryAllByTestId('account-entry')).toHaveLength(0);
  });

  it('groups accounts by venue, selected venue first, active account marked', () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_B, 'tokenB', 'did:b1');
      useAuthStore.getState().loginWithToken(VENUE_A, 'tokenA', 'did:a1');
      useAuthStore.getState().loginWithKeypair(VENUE_A, 'f'.repeat(64), 'did:a2');
    });
    render(<AccountsPanel />);

    const groups = screen.getAllByTestId('accounts-venue');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute('data-venue', VENUE_A); // selected first

    const aEntries = within(groups[0]).getAllByTestId('account-entry');
    expect(aEntries).toHaveLength(2);
    // Latest login is active; earlier account offers a Use button instead.
    expect(aEntries[0]).toHaveAttribute('data-did', 'did:a2');
    expect(aEntries[0]).toHaveAttribute('data-active', 'true');
    expect(within(aEntries[1]).getByTestId('account-use')).toBeInTheDocument();
  });

  it('reactivates a stored account via Use', async () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, 'token1', 'did:a1');
      useAuthStore.getState().loginWithToken(VENUE_A, 'token2', 'did:a2');
    });
    const user = userEvent.setup();
    render(<AccountsPanel />);

    await user.click(screen.getByTestId('account-use'));
    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toMatchObject({ did: 'did:a1' });
  });

  it('signs out of a venue but keeps its accounts listed', async () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, 'token1', 'did:a1');
    });
    const user = userEvent.setup();
    render(<AccountsPanel />);

    await user.click(screen.getByTestId('venue-signout'));
    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
    expect(screen.getAllByTestId('account-entry')).toHaveLength(1);
    expect(screen.getByTestId('account-use')).toBeInTheDocument();
  });

  it('forgets an account entirely via the remove control', async () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, 'token1', 'did:a1');
    });
    const user = userEvent.setup();
    render(<AccountsPanel />);

    await user.click(screen.getByTestId('account-remove'));
    expect(useAuthStore.getState().accountsMap[VENUE_A]).toBeUndefined();
    expect(screen.queryAllByTestId('account-entry')).toHaveLength(0);
    expect(screen.getByTestId('accounts-empty')).toBeInTheDocument();
  });
});
