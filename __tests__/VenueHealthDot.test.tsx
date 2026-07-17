import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { VenueHealthDot } from '@/components/VenueHealthDot';
import { reportVenueHealth } from '@/hooks/use-venue-health';

describe('VenueHealthDot', () => {
  it('tracks reported health for its baseUrl', () => {
    render(<VenueHealthDot baseUrl="http://venue.example" />);
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'unknown');

    act(() => reportVenueHealth('http://venue.example', { state: 'connecting' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'connecting');

    act(() => reportVenueHealth('http://venue.example', { state: 'unreachable', detail: 'Failed to fetch' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'unreachable');

    act(() => reportVenueHealth('http://venue.example', { state: 'connected', version: '0.5.1' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'connected');
  });

  it('ignores reports for other addresses', () => {
    render(<VenueHealthDot baseUrl="http://a.example" />);
    act(() => reportVenueHealth('http://b.example', { state: 'connected' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'unknown');
  });
});
