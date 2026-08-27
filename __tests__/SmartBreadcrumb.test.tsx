import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SmartBreadcrumb } from '@/components/smartbreadcrumb2';

function labels(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="breadcrumb-link"]'))
    .filter((el) => el.closest('[aria-hidden="true"]') === null)
    .map((el) => el.textContent ?? '');
}

describe('SmartBreadcrumb catalog addresses', () => {
  it('collapses namespace segments on /operation/[...path]', () => {
    render(
      <SmartBreadcrumb
        pathname="/operation/v/ops/covia/aggregate-lattice-entries"
        assetOrJobName="Aggregate Lattice Entries"
      />
    );
    expect(labels()).toEqual(['Home', 'Operations', 'Aggregate Lattice Entries']);
  });

  it('collapses namespace segments on /venues/[slug]/operations/[...id]', () => {
    render(
      <SmartBreadcrumb
        pathname="/venues/did%3Aweb%3Atest/operations/v/ops/covia/aggregate-lattice-entries"
        venueName="Covia Test Venue"
        assetOrJobName="Aggregate Lattice Entries"
      />
    );
    expect(labels()).toEqual([
      'Home',
      'Venues',
      'Covia Test Venue',
      'Operations',
      'Aggregate Lattice Entries',
    ]);
  });

  it('still shows the operations list trail without a catalog address', () => {
    render(
      <SmartBreadcrumb
        pathname="/venues/did%3Aweb%3Atest/operations"
        venueName="Covia Test Venue"
      />
    );
    expect(labels()).toEqual(['Home', 'Venues', 'Covia Test Venue', 'Operations']);
  });
});
