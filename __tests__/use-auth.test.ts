import '@testing-library/jest-dom';
import { useAuthStore } from '@/hooks/use-auth';
import { act } from '@testing-library/react';

const MOCK_HEX = '0101010101010101010101010101010101010101010101010101010101010101';

describe('useAuthStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ auth: null, deviceKeyHex: null });
    });
  });

  describe('loginWithKeypair', () => {
    it('should set keypair auth', () => {
      act(() => {
        useAuthStore.getState().loginWithKeypair('abc123', 'did:key:z6Mk...');
      });
      const auth = useAuthStore.getState().auth;
      expect(auth).toEqual({
        type: 'keypair',
        privateKeyHex: 'abc123',
        did: 'did:key:z6Mk...',
      });
    });
  });

  describe('loginWithToken', () => {
    it('should set bearer auth', () => {
      act(() => {
        useAuthStore.getState().loginWithToken('token123', 'did:key:z6Mk...');
      });
      const auth = useAuthStore.getState().auth;
      expect(auth).toEqual({
        type: 'bearer',
        token: 'token123',
        did: 'did:key:z6Mk...',
      });
    });
  });

  describe('logout', () => {
    it('should clear auth but preserve deviceKeyHex', () => {
      act(() => {
        useAuthStore.getState().setDeviceKeyHex(MOCK_HEX);
        useAuthStore.getState().loginWithKeypair(MOCK_HEX, 'did:key:z6Mk...');
      });
      expect(useAuthStore.getState().auth).not.toBeNull();

      act(() => {
        useAuthStore.getState().logout();
      });
      expect(useAuthStore.getState().auth).toBeNull();
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
        useAuthStore.getState().loginWithKeypair(MOCK_HEX, 'did:key:z6Mk...');
      });

      act(() => {
        useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().getDeviceKeyHex()).toBe(MOCK_HEX);
    });
  });
});
