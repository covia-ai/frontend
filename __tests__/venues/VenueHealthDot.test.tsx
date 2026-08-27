import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { VenueHealthDot } from '@/components/VenueHealthDot';
import { reportVenueHealth } from '@/hooks/use-venue-health';
import { useVenueHealth } from '@/hooks/use-venue-health';
import { useAuthStore } from '@/hooks/use-auth';
import { reportVenueAuthHealth, useVenueAuthHealth } from '@/hooks/use-venue-auth-health';

const mockValidateVenueById = jest.fn();
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useValidateVenueById: (venueId?: string) => mockValidateVenueById(venueId),
}));

const VENUE_ID = 'did:web:venue.example';
const AUTH = { type: 'keypair' as const, privateKeyHex: 'abc', did: 'did:key:user' };

describe('VenueHealthDot', () => {
  beforeEach(() => {
    mockValidateVenueById.mockClear();
    act(() => {
      useVenueHealth.setState({ byUrl: {} });
      useVenueAuthHealth.setState({ byVenue: {} });
      useAuthStore.setState({ authMap: {}, accountsMap: {} });
    });
  });

  it('starts validation for every venue represented by a dot', () => {
    render(<VenueHealthDot baseUrl="http://venue.example" venueId={VENUE_ID} />);
    expect(mockValidateVenueById).toHaveBeenCalledWith(VENUE_ID);
  });

  it('tracks reported health for its baseUrl', () => {
    render(<VenueHealthDot baseUrl="http://venue.example" />);
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'unknown');

    act(() => reportVenueHealth('http://venue.example', { state: 'connecting' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'connecting');

    act(() => reportVenueHealth('http://venue.example', { state: 'unreachable', detail: 'Failed to fetch' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'unreachable');
    expect(screen.getByTestId('venue-health-dot')).toHaveClass('bg-muted-foreground/40');

    act(() => reportVenueHealth('http://venue.example', { state: 'connected', version: '0.5.1' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'connected');
  });

  it('ignores reports for other addresses', () => {
    render(<VenueHealthDot baseUrl="http://a.example" />);
    act(() => reportVenueHealth('http://b.example', { state: 'connected' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'unknown');
  });

  it('shows publicly accessible signed-out venues as green', () => {
    render(<VenueHealthDot baseUrl="http://venue.example" venueId={VENUE_ID} />);
    act(() => reportVenueHealth('http://venue.example', { state: 'connected', publicAccess: true }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'public');
  });

  it('shows private signed-out venues as amber', () => {
    render(<VenueHealthDot baseUrl="http://venue.example" venueId={VENUE_ID} />);
    act(() => reportVenueHealth('http://venue.example', { state: 'connected', publicAccess: false }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'signed-out');
  });

  it('only becomes green after the active account is accepted', () => {
    act(() => useAuthStore.setState({ authMap: { [VENUE_ID]: AUTH } }));
    render(<VenueHealthDot baseUrl="http://venue.example" venueId={VENUE_ID} />);
    act(() => reportVenueHealth('http://venue.example', { state: 'connected' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'auth-checking');

    act(() => reportVenueAuthHealth(VENUE_ID, AUTH, {
      state: 'rejected',
      status: 403,
      detail: 'User is not registered',
    }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'auth-rejected');

    act(() => reportVenueAuthHealth(VENUE_ID, AUTH, { state: 'accepted' }));
    expect(screen.getByTestId('venue-health-dot')).toHaveAttribute('data-health', 'connected');
  });
});
