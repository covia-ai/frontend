import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {AssetCard} from '@/components/AssetCard';
import { Asset, Grid , VenueInterface} from '@/lib/covia';

//Mock Data
let asset:Asset, venue:VenueInterface;

beforeAll(async () => {
    venue = await Grid.connect("did:web:venue-test.covia.ai");
    asset = await venue.getAsset("8daf239fd79964c0a8a3171487f8b00bdfd224a5dcede5348c8c5832da1cca52");
  });

describe('AssetCard Component', () => {
  test('renders asset card', () => {
  
    render(<AssetCard  asset={asset} type="asset" />);
    expect(screen.getByTestId('asset-header')).toBeInTheDocument();
    expect(screen.getByTestId('asset-description')).toBeInTheDocument();
  });
});
