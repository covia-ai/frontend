
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IdAndLink } from '@/components/IdandLink';

const hash = '44e9a50dea5a92a2f91f2cdd410dc0e1c5bf5a42fe14280cbbb86c247124ef99';
const venueId = 'did:web:mikera1337-covia-space.hf.space';

describe('IdandLink Component', () => {
  test('renders an asset id prefixed with the venue DID', () => {
    render(<IdAndLink type="asset" venueId={venueId} id={hash} />);
    expect(screen.getByTestId('idcopy_btn')).toBeInTheDocument();
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(`${venueId}/a/${hash}`);
  });

  test('renders a job id under the job namespace, not asset', () => {
    render(<IdAndLink type="Job" venueId={venueId} id={hash} />);
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(`${venueId}/j/${hash}`);
  });

  test('falls back to a bare namespaced id when venueId is not yet known', () => {
    render(<IdAndLink type="Job" id={hash} />);
    expect(screen.getByTestId('idcopy_btn')).toHaveTextContent(`j/${hash}`);
  });
});
