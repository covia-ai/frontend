import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { IdentityTokenButton } from '@/components/IdentityTokenButton';

const KEY_ACCOUNT = {
  type: 'keypair' as const,
  privateKeyHex: 'b'.repeat(64),
  did: 'did:key:zMe',
};
const VENUE = 'did:key:z6MkHomeVenue';

const decodeClaims = (token: string) =>
  JSON.parse(
    Buffer.from(
      token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString(),
  );

describe('MintTokenDialog', () => {
  it('mints a token for a custom audience and lifetime, invalidating on edit', async () => {
    const user = userEvent.setup();
    render(<IdentityTokenButton venueId={VENUE} account={KEY_ACCOUNT} />);

    await user.click(screen.getByTestId('account-token'));
    await user.click(await screen.findByTestId('token-custom'));

    // Audience prefills with the home venue and is editable (cross-venue case).
    const audience = await screen.findByTestId('mint-token-audience');
    expect(audience).toHaveValue(VENUE);
    await user.clear(audience);
    await user.type(audience, 'did:key:z6MkOtherVenue');

    const amount = screen.getByTestId('mint-token-amount');
    await user.clear(amount);
    await user.type(amount, '2');

    await user.click(screen.getByTestId('mint-token-mint'));
    const token = (await screen.findByTestId('mint-token-value')).textContent!;
    const claims = decodeClaims(token);
    expect(claims.aud).toBe('did:key:z6MkOtherVenue');
    expect(claims.exp - claims.iat).toBe(2 * 3600); // default unit: hours

    // Copy puts the minted token on the clipboard.
    await user.click(screen.getByTestId('mint-token-copy'));
    expect(await navigator.clipboard.readText()).toBe(token);

    // Editing an input discards the minted token so a stale one can't linger.
    await user.clear(amount);
    await user.type(amount, '3');
    expect(screen.queryByTestId('mint-token-value')).not.toBeInTheDocument();
  });

  it('disables minting for an invalid audience', async () => {
    const user = userEvent.setup();
    render(<IdentityTokenButton venueId={VENUE} account={KEY_ACCOUNT} />);

    await user.click(screen.getByTestId('account-token'));
    await user.click(await screen.findByTestId('token-custom'));

    const audience = await screen.findByTestId('mint-token-audience');
    await user.clear(audience);
    await user.type(audience, 'not-a-did');
    expect(screen.getByTestId('mint-token-mint')).toBeDisabled();
  });
});
