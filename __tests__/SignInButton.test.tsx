import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';

jest.mock('@covia/covia-sdk', () => ({
  generateKeyPair: jest.fn(() => ({
    privateKey: new Uint8Array(32),
    publicKey: new Uint8Array(32),
  })),
  privateKeyToHex: jest.fn(() => 'mockhex'),
  Ed25519Auth: {
    fromHex: jest.fn(() => ({ getDID: () => 'did:key:z6Mock' })),
  },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  gtmEvent: { buttonClick: jest.fn() },
}));

jest.mock('@/hooks/use-venues', () => ({
  useVenues: Object.assign(() => ({ venues: [], addVenue: jest.fn() }), {
    getState: () => ({ venues: [], addVenue: jest.fn() }),
  }),
}));

// Must import after mocks are set up
import { SignInButton } from '@/components/admin-panel/signin-button';
import { useAuthStore } from '@/hooks/use-auth';

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe('SignInButton', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ auth: null, deviceKeyHex: null });
    });
    mockWriteText.mockClear();
  });

  describe('when logged out', () => {
    it('should render Sign In button', () => {
      render(<SignInButton />);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  describe('when logged in', () => {
    const mockDid = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';

    beforeEach(() => {
      act(() => {
        useAuthStore.setState({
          auth: { type: 'keypair', privateKeyHex: 'abc123', did: mockDid },
        });
      });
    });

    it('should render avatar with DID initials', () => {
      render(<SignInButton />);
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('should show dropdown with Copy DID option on avatar click', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByText('OK'));

      await waitFor(() => {
        expect(screen.getByText('Copy DID')).toBeInTheDocument();
      });
    });

    it('should show Copy DID option with copy icon in dropdown', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByText('OK'));

      await waitFor(() => {
        const copyItem = screen.getByRole('menuitem', { name: /Copy DID/ });
        expect(copyItem).toBeInTheDocument();
      });
    });

    it('should show Sign Out option in dropdown', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByText('OK'));

      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should show Keyboard Shortcuts option in dropdown', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByText('OK'));

      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      });
    });
  });
});
