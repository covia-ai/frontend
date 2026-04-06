import '@testing-library/jest-dom';
import { useAuthStore } from '@/hooks/use-auth';
import { act } from '@testing-library/react';

const MOCK_PRIVATE_KEY = new Uint8Array(32).fill(1);
const MOCK_HEX = '0101010101010101010101010101010101010101010101010101010101010101';

jest.mock('@covia/covia-sdk', () => ({
  generateKeyPair: jest.fn(() => ({
    privateKey: MOCK_PRIVATE_KEY,
    publicKey: new Uint8Array(32).fill(2),
  })),
  privateKeyToHex: jest.fn(() => MOCK_HEX),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state between tests
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
        useAuthStore.setState({ deviceKeyHex: MOCK_HEX });
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

  describe('getOrCreateDeviceKey', () => {
    it('should generate a new key when none exists', () => {
      let key: string;
      act(() => {
        key = useAuthStore.getState().getOrCreateDeviceKey();
      });
      expect(key!).toBe(MOCK_HEX);
      expect(useAuthStore.getState().deviceKeyHex).toBe(MOCK_HEX);
    });

    it('should return existing key when one already exists', () => {
      const existingHex = 'existingkey123';
      act(() => {
        useAuthStore.setState({ deviceKeyHex: existingHex });
      });

      let key: string;
      act(() => {
        key = useAuthStore.getState().getOrCreateDeviceKey();
      });
      expect(key!).toBe(existingHex);
    });

    it('should return the same key across logout cycles', () => {
      let key1: string;
      let key2: string;

      act(() => {
        key1 = useAuthStore.getState().getOrCreateDeviceKey();
        useAuthStore.getState().loginWithKeypair(key1, 'did:key:z6Mk...');
      });

      act(() => {
        useAuthStore.getState().logout();
      });

      act(() => {
        key2 = useAuthStore.getState().getOrCreateDeviceKey();
      });

      expect(key1!).toBe(key2!);
    });
  });
});
