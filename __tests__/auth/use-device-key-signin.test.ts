import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockProbe = jest.fn();
jest.mock('@/lib/venue-auth-probe', () => ({
  probeDeviceKeyAuth: (...args: unknown[]) => mockProbe(...args),
}));

const mockNotifyWarning = jest.fn();
jest.mock('@/lib/notify', () => ({
  notifyWarning: (...args: unknown[]) => mockNotifyWarning(...args),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyInfo: jest.fn(),
}));

import { useDeviceKeySignIn } from '@/hooks/use-device-key-signin';
import { useAuthStore } from '@/hooks/use-auth';
import { useVenues } from '@/hooks/use-venues';

const KEY = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const VENUE = 'did:web:venue-1.example.com';

describe('useDeviceKeySignIn venue validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
      useVenues.setState({
        venues: [
          { venueId: VENUE, baseUrl: 'https://venue-1.example.com', metadata: { name: 'Venue 1' } },
        ],
        selectedVenueId: VENUE,
      });
    });
  });

  it('probes the venue and signs in when the key is accepted', async () => {
    mockProbe.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useDeviceKeySignIn());

    act(() => useAuthStore.getState().setDeviceKeyHex(KEY));
    act(() => result.current.openDialog());
    await act(async () => result.current.handleContinue());

    expect(mockProbe).toHaveBeenCalledWith('https://venue-1.example.com', VENUE, KEY);
    expect(useAuthStore.getState().getAuthForVenue(VENUE)).toMatchObject({ privateKeyHex: KEY });
    expect(result.current.dialogOpen).toBe(false);
  });

  it('targets an explicitly scoped venue instead of the global selection', async () => {
    const scopedVenue = 'did:web:venue-2.example.com';
    mockProbe.mockResolvedValue({ ok: true });
    act(() => {
      useVenues.setState({
        venues: [
          ...useVenues.getState().venues,
          { venueId: scopedVenue, baseUrl: 'https://venue-2.example.com', metadata: { name: 'Venue 2' } },
        ],
      });
    });
    const { result } = renderHook(() => useDeviceKeySignIn({ venueId: scopedVenue }));

    act(() => useAuthStore.getState().setDeviceKeyHex(KEY));
    act(() => result.current.openDialog());
    await act(async () => result.current.handleContinue());

    expect(mockProbe).toHaveBeenCalledWith('https://venue-2.example.com', scopedVenue, KEY);
    expect(useAuthStore.getState().getAuthForVenue(scopedVenue)).toMatchObject({ privateKeyHex: KEY });
    expect(useAuthStore.getState().getAuthForVenue(VENUE)).toBeNull();
  });

  it('blocks the sign-in and surfaces the rejection when the venue returns 403', async () => {
    mockProbe.mockResolvedValue({ ok: false, kind: 'rejected', status: 403, message: 'Forbidden' });
    const { result } = renderHook(() => useDeviceKeySignIn());

    act(() => useAuthStore.getState().setDeviceKeyHex(KEY));
    act(() => result.current.openDialog());
    await act(async () => result.current.handleContinue());

    // No broken session may be recorded.
    expect(useAuthStore.getState().getAuthForVenue(VENUE)).toBeNull();
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.step).toBe('show');
    expect(result.current.authError).toContain('403');
    expect(result.current.authError).toContain(result.current.deviceKeyDid);
  });

  it('proceeds with a warning when the venue cannot be verified (offline, old venue)', async () => {
    mockProbe.mockResolvedValue({ ok: false, kind: 'unverified', message: 'Failed to fetch' });
    const { result } = renderHook(() => useDeviceKeySignIn());

    act(() => useAuthStore.getState().setDeviceKeyHex(KEY));
    act(() => result.current.openDialog());
    await act(async () => result.current.handleContinue());

    expect(useAuthStore.getState().getAuthForVenue(VENUE)).toMatchObject({ privateKeyHex: KEY });
    expect(mockNotifyWarning).toHaveBeenCalled();
    expect(result.current.dialogOpen).toBe(false);
  });

  it('exposes stored keys and signs in with a chosen one', async () => {
    mockProbe.mockResolvedValue({ ok: true });
    act(() => {
      useAuthStore.getState().addDeviceKey(KEY);
      useAuthStore.getState().addDeviceKey(KEY_B);
    });
    const { result } = renderHook(() => useDeviceKeySignIn());

    expect(result.current.storedKeys).toHaveLength(2);
    await act(async () => result.current.handleUseStoredKey(KEY_B));

    expect(useAuthStore.getState().getAuthForVenue(VENUE)).toMatchObject({ privateKeyHex: KEY_B });
  });

  it('clears the rejection when the user chooses a different key', async () => {
    mockProbe.mockResolvedValue({ ok: false, kind: 'rejected', status: 403, message: 'Forbidden' });
    const { result } = renderHook(() => useDeviceKeySignIn());

    act(() => useAuthStore.getState().setDeviceKeyHex(KEY));
    act(() => result.current.openDialog());
    await act(async () => result.current.handleContinue());
    expect(result.current.authError).toBeTruthy();

    act(() => result.current.handleUseDifferentKey());
    expect(result.current.authError).toBeNull();
    expect(result.current.step).toBe('choose');
    expect(result.current.dialogOpen).toBe(true);
  });
});
