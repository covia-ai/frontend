import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  abbreviateDid: (value: string) => value,
}));

jest.mock('@/hooks/use-venues', () => ({
  useVenues: Object.assign((selector: (state: any) => unknown) => selector({
    venues: [],
    selectedVenueId: 'did:web:venue.example',
    addVenue: jest.fn(),
  }), {
    getState: () => ({
      venues: [],
      selectedVenueId: 'did:web:venue.example',
      addVenue: jest.fn(),
    }),
  }),
}));

// Must import after mocks are set up
import { ChromeSignInButton } from '@/components/admin-panel/signin-button';
import { useAuthStore } from '@/hooks/use-auth';

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe('ChromeSignInButton', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ authMap: {}, deviceKeyHex: null });
    });
    mockWriteText.mockClear();
  });

  describe('when logged out', () => {
    it('should render Sign In button', () => {
      render(<ChromeSignInButton />);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  describe('when logged in', () => {
    const mockDid = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';

    beforeEach(() => {
      act(() => {
        useAuthStore.setState({
          authMap: {
            'did:web:venue.example': {
              type: 'keypair',
              privateKeyHex: 'abc123',
              did: mockDid,
            },
          },
        });
      });
    });

    it('should render an identity icon button instead of DID-initials avatar', () => {
      render(<ChromeSignInButton />);
      expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    });

    it('should show My Profile option on account menu click', async () => {
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'My Profile' })).toBeInTheDocument();
      });
    });

    it('should link My Profile to the /profile page', async () => {
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'My Profile' })).toHaveAttribute('href', '/profile');
      });
    });

    it('should show Sign Out option in dropdown', async () => {
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
      });
    });

    it('should not show Copy DID or Keyboard Shortcuts in the simplified dropdown', async () => {
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
      });
      expect(screen.queryByText('Copy DID')).not.toBeInTheDocument();
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('lists other stored accounts for this venue and switches on click — no new-key paths', async () => {
      const VENUE = 'did:web:venue.example';
      const keyAccount = { type: 'keypair' as const, privateKeyHex: 'a'.repeat(64), did: 'did:key:zActive' };
      const oauthAccount = { type: 'bearer' as const, token: 'tok-1', did: 'did:oauth:me' };
      act(() => {
        useAuthStore.setState({
          authMap: { [VENUE]: keyAccount },
          accountsMap: { [VENUE]: [keyAccount, oauthAccount] },
        } as never);
      });
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));

      // Only the OTHER stored account is offered; switching is the only
      // account action here — no key generation or fresh sign-in entries.
      const item = await screen.findByTestId('switch-account');
      expect(item).toHaveAttribute('data-did', 'did:oauth:me');
      expect(screen.getAllByTestId('switch-account')).toHaveLength(1);
      expect(screen.queryByText(/continue with/i)).not.toBeInTheDocument();

      await user.click(item);
      expect(useAuthStore.getState().authMap[VENUE]).toMatchObject({
        did: 'did:oauth:me',
        type: 'bearer',
      });
    });

    it('signed-out menu offers recent stored accounts for one-click sign-in', async () => {
      const VENUE = 'did:web:venue.example';
      const keyAccount = { type: 'keypair' as const, privateKeyHex: 'a'.repeat(64), did: 'did:key:zStored' };
      act(() => {
        useAuthStore.setState({
          authMap: {},
          accountsMap: { [VENUE]: [keyAccount] },
        } as never);
      });
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByText('Sign In'));
      const item = await screen.findByTestId('recent-account');
      expect(item).toHaveAttribute('data-did', 'did:key:zStored');
      // The explicit sign-in flows remain — recents sit above them, and
      // nothing new is minted by choosing one.
      expect(screen.getByText('Continue with a device key')).toBeInTheDocument();

      await user.click(item);
      expect(useAuthStore.getState().authMap[VENUE]).toMatchObject({ did: 'did:key:zStored' });
    });

    it('offers no account switching when only one login is stored', async () => {
      const VENUE = 'did:web:venue.example';
      const keyAccount = { type: 'keypair' as const, privateKeyHex: 'a'.repeat(64), did: 'did:key:zActive' };
      act(() => {
        useAuthStore.setState({
          authMap: { [VENUE]: keyAccount },
          accountsMap: { [VENUE]: [keyAccount] },
        } as never);
      });
      const user = userEvent.setup();
      render(<ChromeSignInButton />);

      await user.click(screen.getByRole('button', { name: 'Account menu' }));
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
      });
      expect(screen.queryByTestId('switch-account')).not.toBeInTheDocument();
      expect(screen.queryByText('Switch account')).not.toBeInTheDocument();
    });
  });
});
