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

    it('should render an identity icon button instead of DID-initials avatar', () => {
      render(<SignInButton />);
      expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    });

    it('should show My Profile option on account menu click', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'My Profile' })).toBeInTheDocument();
      });
    });

    it('should link My Profile to the /profile page', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'My Profile' })).toHaveAttribute('href', '/profile');
      });
    });

    it('should show Sign Out option in dropdown', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
      });
    });

    it('should not show Copy DID or Keyboard Shortcuts in the simplified dropdown', async () => {
      const user = userEvent.setup();
      render(<SignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
      });
      expect(screen.queryByText('Copy DID')).not.toBeInTheDocument();
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });
});
