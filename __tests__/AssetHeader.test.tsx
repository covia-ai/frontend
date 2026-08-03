
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetHeader } from '@/components/AssetHeader';
import { DataAsset, Operation, Venue } from '@covia/covia-sdk';

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
  test('renders name and description', () => {
    const mockAsset = new DataAsset(HASH, makeVenue(), delayMetadata);
    render(<AssetHeader asset={mockAsset} />);
    expect(screen.getByText('Delay Operation')).toBeInTheDocument();
    expect(screen.getByTestId('assetH_descr')).toHaveTextContent('Runs another op after a delay');
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
});
