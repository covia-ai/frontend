import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { AssetChip } from '@/components/AssetChip';

const ASSET_ID = 'a3f2c9e1b7d4568901234567890abcdef1234567890abcdef1234567890abcd';
const VENUE_ID = 'did:web:venue-test.covia.ai';

describe('AssetChip', () => {
  it('renders the elided monospace hash with the full value as data', () => {
    render(<AssetChip assetId={ASSET_ID} venueId={VENUE_ID} />);
    const chip = screen.getByTestId('asset-chip');
    expect(chip).toHaveAttribute('data-value', ASSET_ID);
    expect(chip).toHaveTextContent('…');
    expect(chip).toHaveTextContent(ASSET_ID.slice(-4));
    expect(chip.textContent).not.toContain(ASSET_ID);
  });

  it('renders the whole value with chars="full"', () => {
    render(<AssetChip assetId={ASSET_ID} venueId={VENUE_ID} chars="full" />);
    expect(screen.getByTestId('asset-chip').textContent).toContain(ASSET_ID);
  });

  it('has no identicon — a content hash carries no key bytes', () => {
    render(<AssetChip assetId={ASSET_ID} venueId={VENUE_ID} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('links "Open asset" to the venue-scoped asset page', async () => {
    const user = userEvent.setup();
    render(<AssetChip assetId={ASSET_ID} venueId={VENUE_ID} />);

    await user.click(screen.getByTestId('asset-chip'));
    const openLink = await screen.findByTestId('asset-chip-open');

    expect(openLink).toHaveAttribute(
      'href',
      `/venues/${encodeURIComponent(VENUE_ID)}/assets/${encodeURIComponent(ASSET_ID)}`,
    );
  });

  it('copies the full asset id from the menu', async () => {
    const user = userEvent.setup();
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');
    render(<AssetChip assetId={ASSET_ID} venueId={VENUE_ID} />);

    await user.click(screen.getByTestId('asset-chip'));
    await user.click(await screen.findByTestId('asset-chip-copy'));

    expect(writeText).toHaveBeenCalledWith(ASSET_ID);
  });
});
