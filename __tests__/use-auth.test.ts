import '@testing-library/jest-dom';
import { useAuthStore } from '@/hooks/use-auth';
import { act } from '@testing-library/react';

const MOCK_HEX = '0101010101010101010101010101010101010101010101010101010101010101';
const VENUE_A = 'did:web:venue-a.example.com';
const VENUE_B = 'did:web:venue-b.example.com';

describe('useAuthStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ authMap: {}, activeVenueId: null, auth: null, deviceKeyHex: null });
    });
  });

  describe('loginWithKeypair', () => {
    it('should set keypair auth for a venue', () => {
      act(() => {
        useAuthStore.getState().loginWithKeypair(VENUE_A, 'abc123', 'did:key:z6Mk...');
      });
      const auth = useAuthStore.getState().auth;
      expect(auth).toEqual({
        type: 'keypair',
        privateKeyHex: 'abc123',
        did: 'did:key:z6Mk...',
      });
      expect(useAuthStore.getState().activeVenueId).toBe(VENUE_A);
    });
  });

  describe('loginWithToken', () => {
    it('should set bearer auth for a venue', () => {
      act(() => {
        useAuthStore.getState().loginWithToken(VENUE_A, 'token123', 'did:key:z6Mk...');
      });
      const auth = useAuthStore.getState().auth;
      expect(auth).toEqual({
        type: 'bearer',
        token: 'token123',
        did: 'did:key:z6Mk...',
      });
      expect(useAuthStore.getState().activeVenueId).toBe(VENUE_A);
    });
  });

  describe('per-venue auth', () => {
    it('should store separate auth per venue', () => {
      act(() => {
        useAuthStore.getState().loginWithToken(VENUE_A, 'tokenA', 'did:a');
        useAuthStore.getState().loginWithToken(VENUE_B, 'tokenB', 'did:b');
      });
      // Active venue should be the last one logged in
      expect(useAuthStore.getState().auth).toEqual({
        type: 'bearer',
        token: 'tokenB',
        did: 'did:b',
      });
      // Switch back to venue A
      act(() => {
        useAuthStore.getState().setActiveVenue(VENUE_A);
      });
      expect(useAuthStore.getState().auth).toEqual({
        type: 'bearer',
        token: 'tokenA',
        did: 'did:a',
      });
    });

    it('should return null auth for a venue with no stored auth', () => {
      expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
    });

    it('should return auth for a specific venue', () => {
      act(() => {
        useAuthStore.getState().loginWithToken(VENUE_A, 'tokenA', 'did:a');
      });
      expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toEqual({
        type: 'bearer',
        token: 'tokenA',
        did: 'did:a',
      });
      expect(useAuthStore.getState().getAuthForVenue(VENUE_B)).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear auth for active venue only and preserve deviceKeyHex', () => {
      act(() => {
        useAuthStore.getState().setDeviceKeyHex(MOCK_HEX);
        useAuthStore.getState().loginWithKeypair(VENUE_A, MOCK_HEX, 'did:key:z6Mk...');
        useAuthStore.getState().loginWithToken(VENUE_B, 'tokenB', 'did:b');
      });
      // Switch to venue A and logout
      act(() => {
        useAuthStore.getState().setActiveVenue(VENUE_A);
      });
      act(() => {
        useAuthStore.getState().logout();
      });
      expect(useAuthStore.getState().auth).toBeNull();
      expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
      // Venue B should still have auth
      expect(useAuthStore.getState().getAuthForVenue(VENUE_B)).toEqual({
        type: 'bearer',
        token: 'tokenB',
        did: 'did:b',
      });
      expect(useAuthStore.getState().deviceKeyHex).toBe(MOCK_HEX);
    });
  });

  describe('getDeviceKeyHex / setDeviceKeyHex', () => {
    it('should return null when no key exists', () => {
      expect(useAuthStore.getState().getDeviceKeyHex()).toBeNull();
    });

    it('should store and return device key', () => {
      act(() => {
        useAuthStore.getState().setDeviceKeyHex(MOCK_HEX);
      });
      expect(useAuthStore.getState().getDeviceKeyHex()).toBe(MOCK_HEX);
    });

    it('should preserve device key across logout cycles', () => {
      act(() => {
        useAuthStore.getState().setDeviceKeyHex(MOCK_HEX);
        useAuthStore.getState().loginWithKeypair(VENUE_A, MOCK_HEX, 'did:key:z6Mk...');
      });

      act(() => {
        useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().getDeviceKeyHex()).toBe(MOCK_HEX);
    });
  });
});
