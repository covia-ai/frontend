import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { didFromPublicKey, generateKeyPair } from '@covia/covia-sdk';

import { DidDisplay } from '@/components/DidDisplay';
import { abbreviateDid } from '@/lib/utils';

const LONG_DID = 'did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('abbreviateDid', () => {
  it('elides the middle, keeping the head and the last 4 characters', () => {
    const out = abbreviateDid(LONG_DID);
    expect(out).toBe(`${LONG_DID.slice(0, 16)}…${LONG_DID.slice(-4)}`);
  });

  it('passes short values through unchanged', () => {
    expect(abbreviateDid('did:key:zSHORT')).toBe('did:key:zSHORT');
  });
});

describe('DidDisplay', () => {
  it('renders the elided monospace value with the full value as data', () => {
    render(<DidDisplay value={LONG_DID} />);
    const display = screen.getByTestId('did-display');
    expect(display).toHaveAttribute('data-value', LONG_DID);
    expect(display).toHaveTextContent('…');
    expect(display).toHaveTextContent(LONG_DID.slice(-4));
    expect(display.textContent).not.toContain(LONG_DID);
  });

  it('renders the whole value with chars="full"', () => {
    render(<DidDisplay value={LONG_DID} chars="full" />);
    expect(screen.getByTestId('did-display').textContent).toContain(LONG_DID);
  });

  it('shows the identicon for a did:key but not for a did:web', () => {
    const { rerender } = render(<DidDisplay value={LONG_DID} />);
    expect(screen.getByRole('img')).toBeInTheDocument();

    rerender(<DidDisplay value="did:web:venue.example.com" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the same identicon for a public key hex as for its did:key', () => {
    const { publicKey } = generateKeyPair();
    const did = didFromPublicKey(publicKey);
    const hex = toHex(publicKey);

    const didRender = render(<DidDisplay value={did} />);
    const didSvg = didRender.getByRole('img').innerHTML;
    didRender.unmount();

    const hexRender = render(<DidDisplay value={hex} />);
    const hexSvg = hexRender.getByRole('img').innerHTML;

    expect(hexSvg).toBe(didSvg);
    expect(hexSvg.length).toBeGreaterThan(0);
  });

  it('copies the full value from the menu', async () => {
    const user = userEvent.setup();
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');
    render(<DidDisplay value={LONG_DID} />);

    await user.click(screen.getByTestId('did-display'));
    await user.click(await screen.findByTestId('did-copy'));

    expect(writeText).toHaveBeenCalledWith(LONG_DID);
  });

  it('appends caller-supplied menu actions', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(<DidDisplay value={LONG_DID} actions={[{ label: 'Inspect', onSelect }]} />);

    await user.click(screen.getByTestId('did-display'));
    await user.click(await screen.findByText('Inspect'));

    expect(onSelect).toHaveBeenCalled();
  });
});
