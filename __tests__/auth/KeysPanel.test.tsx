import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { KeysPanel } from '@/components/KeysPanel';
import { useAuthStore } from '@/hooks/use-auth';
import { useVenues } from '@/hooks/use-venues';

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const VENUE = 'did:web:venue.example.com';

describe('KeysPanel', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
      useVenues.setState({
        venues: [{ venueId: VENUE, baseUrl: 'https://venue.example.com', metadata: { name: 'Venue' } }],
        selectedVenueId: VENUE,
      });
    });
  });

  it('shows an empty state when no keys are stored', () => {
    render(<KeysPanel />);
    expect(screen.getByTestId('keys-panel')).toBeInTheDocument();
    expect(screen.queryAllByTestId('key-entry')).toHaveLength(0);
  });

  it('imports a pasted key, derives its DID, and makes the first key default', async () => {
    const user = userEvent.setup();
    render(<KeysPanel />);

    await user.type(screen.getByTestId('key-import-input'), KEY_A);
    await user.click(screen.getByTestId('key-import'));

    const entry = screen.getByTestId('key-entry');
    expect(entry).toHaveAttribute('data-default', 'true');
    expect(entry.getAttribute('data-did')).toMatch(/^did:/);
    expect(useAuthStore.getState().deviceKeys).toEqual([KEY_A]);
    expect(useAuthStore.getState().deviceKeyHex).toBe(KEY_A);
  });

  it('rejects an invalid pasted key without storing it', async () => {
    const user = userEvent.setup();
    render(<KeysPanel />);

    await user.type(screen.getByTestId('key-import-input'), 'not-a-key');
    await user.click(screen.getByTestId('key-import'));

    expect(useAuthStore.getState().deviceKeys).toHaveLength(0);
    expect(screen.queryAllByTestId('key-entry')).toHaveLength(0);
  });

  it('generates a new key and lists it', async () => {
    const user = userEvent.setup();
    render(<KeysPanel />);

    await user.click(screen.getByTestId('key-generate'));
    expect(useAuthStore.getState().deviceKeys).toHaveLength(1);
    expect(screen.getAllByTestId('key-entry')).toHaveLength(1);
  });

  it('promotes another key to default via Make default', async () => {
    act(() => {
      useAuthStore.getState().addDeviceKey(KEY_A);
      useAuthStore.getState().addDeviceKey(KEY_B);
    });
    const user = userEvent.setup();
    render(<KeysPanel />);

    await user.click(screen.getByTestId('key-make-default'));
    expect(useAuthStore.getState().deviceKeyHex).toBe(KEY_B);
  });

  it('signs in to the selected venue with a chosen key', async () => {
    act(() => useAuthStore.getState().addDeviceKey(KEY_A));
    const user = userEvent.setup();
    render(<KeysPanel />);

    await user.click(screen.getByTestId('key-use'));

    const auth = useAuthStore.getState().getAuthForVenue(VENUE);
    expect(auth).toMatchObject({ type: 'keypair', privateKeyHex: KEY_A });
    expect(auth?.did).toMatch(/^did:/);
    // The login is also recorded in the venue's account history.
    expect(useAuthStore.getState().accountsMap[VENUE]).toHaveLength(1);
  });

  it('counts orphaned sign-ins instead of listing dead venue DIDs under a key', () => {
    const GONE = 'did:key:z6MkDeadVenueIdentityXXXXXXXXXXXXXXXXXXXXXXX';
    act(() => {
      useAuthStore.getState().addDeviceKey(KEY_A);
      // Signed in on a live venue and on a venue that no longer exists.
      useAuthStore.getState().loginWithKeypair(VENUE, KEY_A, 'did:me');
      useAuthStore.getState().loginWithKeypair(GONE, KEY_A, 'did:me');
    });
    render(<KeysPanel />);

    const entry = screen.getByTestId('key-entry');
    expect(entry.textContent).toContain('Venue');
    // The dead venue's DID must not appear — it reads like an account key.
    expect(entry.textContent).not.toContain(GONE);
  });

  it('removes a key and promotes the remaining one to default', async () => {
    act(() => {
      useAuthStore.getState().addDeviceKey(KEY_A);
      useAuthStore.getState().addDeviceKey(KEY_B);
    });
    const user = userEvent.setup();
    render(<KeysPanel />);

    await user.click(screen.getAllByTestId('key-remove')[0]);
    expect(useAuthStore.getState().deviceKeys).toEqual([KEY_B]);
    expect(useAuthStore.getState().deviceKeyHex).toBe(KEY_B);
  });
});
