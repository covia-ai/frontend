import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('@/components/admin-panel/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

const PRIV_HEX = 'a'.repeat(64);
jest.mock('@/hooks/use-auth', () => ({
  useCurrentAuth: () => ({
    type: 'keypair',
    privateKeyHex: PRIV_HEX,
    did: 'did:key:z6MkTest',
  }),
  // The page's hasAnyAccount selector runs against this minimal state.
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ authMap: {}, accountsMap: {}, deviceKeys: [] }),
}));
// Null by default (sections needing a venue stay hidden); individual tests
// install a venue and must reset it.
let mockVenue: { venueId: string; metadata?: { name?: string }; didDocument: () => Promise<unknown> } | null = null;
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock('@/components/AccountsPanel', () => ({
  AccountsPanel: () => <div data-testid="accounts-panel-stub" />,
}));
jest.mock('@/components/KeysPanel', () => ({
  KeysPanel: () => <div data-testid="keys-panel-stub" />,
}));

import ProfilePage from '@/app/(demo)/profile/page';

describe('ProfilePage private key', () => {
  it('conceals the private key by default and reveals only on toggle', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    // Concealed: the raw hex must not be anywhere in the DOM.
    expect(screen.queryByText(PRIV_HEX)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(PRIV_HEX);

    await user.click(screen.getByTestId('secret-field-reveal'));
    expect(screen.getByTestId('secret-field-value')).toHaveTextContent(PRIV_HEX);

    await user.click(screen.getByTestId('secret-field-reveal'));
    expect(document.body.textContent).not.toContain(PRIV_HEX);
  });

  it('copies the real key without revealing it', async () => {
    // userEvent.setup() installs a working clipboard stub — spy on it.
    const user = userEvent.setup();
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');
    const { container } = render(<ProfilePage />);

    const field = screen.getByTestId('secret-field-value');
    const copyButton = field.parentElement!.querySelectorAll('button')[1];
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(PRIV_HEX);
    expect(container.textContent).not.toContain(PRIV_HEX);
  });

  it('offers an identity token on the Identity tab when a venue is selected', async () => {
    mockVenue = {
      venueId: 'did:key:z6MkVenueForToken',
      metadata: { name: 'Venue' },
      didDocument: () => Promise.resolve({}),
    };
    try {
      const user = userEvent.setup();
      const writeText = jest.spyOn(navigator.clipboard, 'writeText');
      render(<ProfilePage />);

      await user.click(screen.getByTestId('account-token'));
      await user.click(await screen.findByTestId('token-lifetime-3600'));

      const token = writeText.mock.calls.at(-1)![0] as string;
      const claims = JSON.parse(
        Buffer.from(
          token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString(),
      );
      expect(claims.aud).toBe('did:key:z6MkVenueForToken');
      expect(claims.exp - claims.iat).toBe(3600);
    } finally {
      mockVenue = null;
    }
  });
});
