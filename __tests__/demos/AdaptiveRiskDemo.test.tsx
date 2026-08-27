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
import { GovernedEscalationDemo } from '@/components/governed-escalation/GovernedEscalationDemo';
import { ADAPTIVE_RISK_BEATS } from '@/components/adaptive-risk/story';
import { ESCALATION_BEATS } from '@/components/governed-escalation/story';
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
    expect(slugs).toContain('governed-escalation');
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('resolves a demo by slug and misses unknown slugs', () => {
    expect(demoBySlug('adaptive-risk')?.title.highlight).toBe('risk');
    expect(demoBySlug('nope')).toBeUndefined();
  });
});

describe('AdaptiveRiskDemo shell', () => {
  it('always renders the honesty panel with the synthetic-data statement', () => {
    render(<AdaptiveRiskDemo />);
    const honesty = screen.getByTestId('demo-honesty');
    expect(honesty).toHaveTextContent(/all data is synthetic/i);
    expect(honesty).toHaveTextContent(/venue's own error string/i);
    expect(honesty).toHaveTextContent(/not trained scorecards/i);
    expect(honesty).toHaveTextContent(/unrestricted/);
  });

  it('renders every beat from the story data', () => {
    render(<AdaptiveRiskDemo />);
    for (const beat of ADAPTIVE_RISK_BEATS) {
      expect(screen.getByTestId(`beat-${beat.id}`)).toHaveTextContent(beat.title);
    }
    expect(ADAPTIVE_RISK_BEATS).toHaveLength(4);
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

describe('GovernedEscalationDemo shell', () => {
  it('labels the drift as a fixture swap and names what stays real', () => {
    render(<GovernedEscalationDemo />);
    const honesty = screen.getByTestId('demo-honesty');
    expect(honesty).toHaveTextContent(/fixture swap/i);
    expect(honesty).toHaveTextContent(/Everything after the monitor reads those numbers is real/i);
    expect(honesty).toHaveTextContent(/sign it yourself/i);
  });

  it('renders both beats and points back at the enforcement demo', () => {
    render(<GovernedEscalationDemo />);
    for (const beat of ESCALATION_BEATS) {
      expect(screen.getByTestId(`beat-${beat.id}`)).toHaveTextContent(beat.title);
    }
    expect(ESCALATION_BEATS).toHaveLength(2);
    expect(screen.getByText('Adaptive Risk').closest('a')).toHaveAttribute(
      'href',
      '/demos/adaptive-risk',
    );
  });

  it('never says "replay" — JOBS.md is reconstruct, never re-execute', () => {
    expect(JSON.stringify(ESCALATION_BEATS)).not.toMatch(/replay/i);
  });
});
