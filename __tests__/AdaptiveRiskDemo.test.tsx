import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Keep a stable venue object across renders (same pattern as
// JobLifecycleDemo.test.tsx) so venue-keyed effects don't refire.
const mockVenueHolder: { venue: unknown } = {
  venue: { venueId: 'test-venue', baseUrl: 'http://venue.test' },
};
let mockAuthenticated = true;

jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => mockVenueHolder.venue,
}));
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => mockAuthenticated,
  // Beat 5 signs the curl's identity token with the device key; the shell
  // tests only need the selector to resolve.
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ authMap: {} }),
}));

import { AdaptiveRiskDemo } from '@/components/adaptive-risk/AdaptiveRiskDemo';
import { ADAPTIVE_RISK_BEATS } from '@/components/adaptive-risk/story';
import { DEMOS, demoBySlug } from '@/lib/demos';

beforeEach(() => {
  mockVenueHolder.venue = { venueId: 'test-venue', baseUrl: 'http://venue.test' };
  mockAuthenticated = true;
});

describe('demo registry', () => {
  it('lists both demos with unique slugs', () => {
    const slugs = DEMOS.map((d) => d.slug);
    expect(slugs).toContain('sdk-job-lifecycle');
    expect(slugs).toContain('adaptive-risk');
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('resolves a demo by slug and misses unknown slugs', () => {
    expect(demoBySlug('adaptive-risk')?.title.highlight).toBe('Risk');
    expect(demoBySlug('nope')).toBeUndefined();
  });
});

describe('AdaptiveRiskDemo shell', () => {
  it('always renders the honesty panel with the synthetic-data statement', () => {
    render(<AdaptiveRiskDemo />);
    const honesty = screen.getByTestId('ar-honesty');
    expect(honesty).toHaveTextContent(/all data is synthetic/i);
    expect(honesty).toHaveTextContent(/fixture swap/i);
    expect(honesty).toHaveTextContent(/not trained scorecards/i);
    expect(honesty).toHaveTextContent(/unrestricted/);
  });

  it('renders all five beats from the story data', () => {
    render(<AdaptiveRiskDemo />);
    for (const beat of ADAPTIVE_RISK_BEATS) {
      expect(screen.getByTestId(`ar-beat-${beat.id}`)).toHaveTextContent(beat.title);
    }
    expect(ADAPTIVE_RISK_BEATS).toHaveLength(5);
  });

  it('asks for a venue when none is selected', () => {
    mockVenueHolder.venue = null;
    render(<AdaptiveRiskDemo />);
    expect(screen.getByTestId('ar-no-venue')).toBeInTheDocument();
  });

  it('asks for sign-in when unauthenticated', () => {
    mockAuthenticated = false;
    render(<AdaptiveRiskDemo />);
    expect(screen.getByTestId('ar-no-auth')).toBeInTheDocument();
  });

  it('never uses the word "replay" in narration (JOBS.md: reconstruct, never re-execute)', () => {
    expect(JSON.stringify(ADAPTIVE_RISK_BEATS)).not.toMatch(/replay/i);
  });
});
