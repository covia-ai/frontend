import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { RemoveVenueModal } from '@/components/RemoveVenueModal';
import { useAuthStore } from '@/hooks/use-auth';
import { useVenues } from '@/hooks/use-venues';
import { getVenueFor } from '@/lib/venue-registry';

const REMOVED = { venueId: 'did:web:removed.example', baseUrl: 'https://removed.example', metadata: {} };
const KEPT = { venueId: 'did:web:kept.example', baseUrl: 'https://kept.example', metadata: {} };

describe('RemoveVenueModal', () => {
  beforeEach(() => {
    act(() => {
      useVenues.setState({ venues: [REMOVED, KEPT], selectedVenueId: REMOVED.venueId });
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
      useAuthStore.getState().loginWithToken(REMOVED.venueId, 'token-removed', 'did:me');
      useAuthStore.getState().loginWithToken(KEPT.venueId, 'token-kept', 'did:me');
    });
  });

  const openDialog = async () => {
    const user = userEvent.setup();
    render(<RemoveVenueModal venueId={REMOVED.venueId} />);
    await user.click(screen.getByTestId('remove_btn'));
    return user;
  };

  it('asks for confirmation before removing anything', async () => {
    await openDialog();

    expect(screen.getByTestId('remove-title')).toBeInTheDocument();
    expect(useVenues.getState().venues).toHaveLength(2);
  });

  it('keeps the venue when the user declines', async () => {
    const user = await openDialog();
    await user.click(screen.getByTestId('remove-cancel'));

    expect(useVenues.getState().venues).toHaveLength(2);
    expect(useAuthStore.getState().getAuthForVenue(REMOVED.venueId)).not.toBeNull();
  });

  it('removes the venue and moves the selection to one that remains', async () => {
    const user = await openDialog();
    await user.click(screen.getByTestId('remove-confirm'));

    expect(useVenues.getState().venues).toEqual([KEPT]);
    expect(useVenues.getState().selectedVenueId).toBe(KEPT.venueId);
  });

  it("forgets the removed venue's credentials and leaves other venues' alone", async () => {
    const user = await openDialog();
    await user.click(screen.getByTestId('remove-confirm'));

    const { authMap, accountsMap } = useAuthStore.getState();
    expect(Object.keys(authMap)).toEqual([KEPT.venueId]);
    expect(Object.keys(accountsMap)).toEqual([KEPT.venueId]);
  });

  it('evicts the cached SDK instance so a re-added venue starts clean', async () => {
    const before = getVenueFor(REMOVED, null);
    const user = await openDialog();
    await user.click(screen.getByTestId('remove-confirm'));

    expect(getVenueFor(REMOVED, null)).not.toBe(before);
  });
});
