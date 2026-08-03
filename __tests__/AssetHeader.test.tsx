
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AssetHeader } from '@/components/AssetHeader';
import { DataAsset, Operation, Venue } from '@covia/covia-sdk';

// AssetHeader's copy button goes through copyDataToClipBoard (the
// copy-to-clipboard package), not navigator.clipboard directly — mock just
// that export, since ui/tooltip.tsx also depends on this module's `cn`.
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  copyDataToClipBoard: jest.fn(),
}));
import { copyDataToClipBoard } from '@/lib/utils';

const VENUE_DID = 'did:web:venue-test.covia.ai';
const HASH = 'a'.repeat(64);

function makeVenue() {
  return new Venue({
    baseUrl: 'https://venue-test.covia.ai',
    venueId: VENUE_DID,
    name: 'TestVenue',
  });
}

const delayMetadata = {
  name: 'Delay Operation',
  description: 'Runs another op after a delay',
  operation: { adapter: 'test:delay', input: { type: 'object' }, output: {} },
};

describe('AssetHeader Component', () => {
  test('shows a kind badge next to the name', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.getByTestId('asset-kind-badge')).toHaveTextContent('Operation');
  });

  test('badges a bare reference asset accordingly', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), { name: 'a reference' });
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.getByTestId('asset-kind-badge')).toHaveTextContent('Reference');
  });

  test('renders name and description', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.getByText('Delay Operation')).toBeInTheDocument();
    expect(screen.getByTestId('assetH_descr')).toHaveTextContent('Runs another op after a delay');
  });

  describe('description', () => {
    test('shows a fallback instead of a blank paragraph when missing', () => {
      const mockAsset = new DataAsset(HASH, makeVenue(), { name: 'no description' });
      render(<AssetHeader asset={mockAsset} />);
      const descr = screen.getByTestId('assetH_descr');
      expect(descr).toHaveTextContent('No description available');
      expect(descr.className).toContain('italic');
    });

    test('does not show a "Show more" toggle when the text is not actually clamped', () => {
      const mockAsset = new DataAsset(HASH, makeVenue(), { name: 'short', description: 'A short line.' });
      render(<AssetHeader asset={mockAsset} />);
      expect(screen.queryByTestId('assetH_descr_toggle')).not.toBeInTheDocument();
    });

    // jsdom never computes real layout, so scrollHeight/clientHeight are both
    // 0 by default — stub them to simulate line-clamp-2 actually cutting text.
    test('shows a "Show more" toggle that expands the full text when clamped', async () => {
      const user = userEvent.setup();
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 40 });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 20 });

      const mockAsset = new DataAsset(HASH, makeVenue(), { name: 'long', description: 'A very long description.' });
      render(<AssetHeader asset={mockAsset} />);

      const toggle = screen.getByTestId('assetH_descr_toggle');
      expect(toggle).toHaveTextContent('Show more');
      expect(screen.getByTestId('assetH_descr').className).toContain('line-clamp-2');

      await user.click(toggle);
      expect(toggle).toHaveTextContent('Show less');
      expect(screen.getByTestId('assetH_descr').className).not.toContain('line-clamp-2');

      Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
      Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    });
  });

  test('content-addressed asset gets a venue-qualified a/<hash> DID URL', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(`${VENUE_DID}/a/${HASH}`);
  });

  test('catalogue-resolved operation keeps its real path — not one derived from the adapter', () => {
    // Old behaviour rebuilt the path from metadata.operation.adapter
    // ("test:delay" -> v/ops/test/delay), which is not where test ops live.
    const op = new Operation('v/test/ops/delay', makeVenue(), delayMetadata);
    render(<AssetHeader asset={op} />);
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(`${VENUE_DID}/v/test/ops/delay`);
  });

  test('the DID URL uses the asset venue, not the current route', () => {
    // Regression guard: the DID used to be scraped from pathname segment [2],
    // which only worked under /venues/[slug]/... routes. jsdom's default
    // pathname here is "/", so any pathname-derived DID would be empty.
    window.history.replaceState({}, '', '/');
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(`${VENUE_DID}/a/${HASH}`);
  });

  test('a fully-qualified asset id is shown unchanged', () => {
    const foreign = `did:web:other.covia.ai/v/ops/json/merge`;
    const op = new Operation(foreign, makeVenue(), delayMetadata);
    render(<AssetHeader asset={op} />);
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(foreign);
  });

  test('caller-owned workspace paths stay namespace-relative — no venue DID minted', () => {
    const op = new Operation('w/ops/my-op', makeVenue(), delayMetadata);
    render(<AssetHeader asset={op} />);
    const pill = screen.getByTestId('idcopy_btn');
    expect(pill).toHaveTextContent('w/ops/my-op');
    expect(pill).not.toHaveTextContent(VENUE_DID);
  });

  test('no DID URL pill when the id is not a resolvable lattice address', () => {
    const mockAsset = new DataAsset('test-asset', makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.queryByTestId('idcopy_btn')).not.toBeInTheDocument();
  });

  test('an a/<hash> DID URL links to this asset\'s own viewer', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    const link = screen.getByRole('link', { name: `${VENUE_DID}/a/${HASH}` });
    expect(link).toHaveAttribute('href', `/venues/${encodeURIComponent(VENUE_DID)}/assets/${HASH}`);
  });

  test('a venue catalogue path links to the operation viewer', () => {
    const op = new Operation('v/test/ops/delay', makeVenue(), delayMetadata);
    render(<AssetHeader asset={op} />);
    const link = screen.getByRole('link', { name: `${VENUE_DID}/v/test/ops/delay` });
    expect(link).toHaveAttribute('href', `/venues/${encodeURIComponent(VENUE_DID)}/operations/test/ops/delay`);
  });

  test('caller-owned workspace paths stay plain text — nowhere venue-scoped to send them', () => {
    const op = new Operation('w/ops/my-op', makeVenue(), delayMetadata);
    render(<AssetHeader asset={op} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent('w/ops/my-op');
  });

  // Regression: TooltipTrigger renders a real <button> unless asChild chains
  // it onto the pill directly — nesting the new <Link> (an <a>) inside that
  // button would be invalid, interactive-in-interactive HTML.
  test('does not nest the link inside a button', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    const { container } = render(<AssetHeader asset={mockAsset} />);
    expect(container.querySelector('button a')).toBeNull();
  });

  // The pill may also show a leading Link2 icon (when the DID is clickable);
  // the copy action is always the last svg in the pill.
  function getCopyIcon() {
    const svgs = screen.getByTestId('idcopy_btn').querySelectorAll('svg');
    return svgs[svgs.length - 1];
  }

  describe('copy button', () => {
    beforeEach(() => {
      (copyDataToClipBoard as jest.Mock).mockClear();
    });

    // A bare DID string isn't something anyone else can paste and open —
    // when there's an app route for it, copy an absolute link to that
    // instead of the DID URL itself.
    test('copies an absolute app link, not the bare DID URL', async () => {
      const user = userEvent.setup();
      const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
      render(<AssetHeader asset={mockAsset} />);

      await user.click(getCopyIcon());

      expect(copyDataToClipBoard).toHaveBeenCalledWith(
        `${window.location.origin}/venues/${encodeURIComponent(VENUE_DID)}/assets/${HASH}`,
        'Asset Url copied to clipboard',
      );
    });

    test('falls back to the raw DID text when there is nowhere venue-scoped to link to', async () => {
      const user = userEvent.setup();
      const op = new Operation('w/ops/my-op', makeVenue(), delayMetadata);
      render(<AssetHeader asset={op} />);

      await user.click(getCopyIcon());

      expect(copyDataToClipBoard).toHaveBeenCalledWith('w/ops/my-op', 'DID URL copied to clipboard');
    });
  });
});
