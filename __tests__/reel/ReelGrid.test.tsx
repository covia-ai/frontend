import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReelGrid, audiencesOf, filterByAudience, unreachableClips } from '@/components/reel/ReelGrid';
import type { ReelClip } from '@/config/demo-reel';

const CLIPS: ReelClip[] = [
  {
    slug: 'n6-day-on-the-grid', id: 'n6', title: 'A Day on the Grid',
    claim: 'One run, end to end.', audiences: ['Investor', 'CISO'], runtimeSec: 169,
    poster: 'n6-day-on-the-grid.webp',
    cuts: {
      narrated: { media: 'n6-day-on-the-grid/narrated.mp4', captions: 'n6-day-on-the-grid/narrated.vtt' },
      ciso: { media: 'n6-day-on-the-grid/ciso.mp4', captions: 'n6-day-on-the-grid/ciso.vtt' },
    },
  },
  {
    slug: 'c5-sdk-job', id: 'c5', title: 'Run a Job with the SDK',
    claim: 'A developer reaches execution in a few lines.', audiences: ['Developers'], runtimeSec: 62,
    poster: 'c5-sdk-job.webp',
    cuts: { narrated: { media: 'c5-sdk-job/narrated.mp4', captions: 'c5-sdk-job/narrated.vtt' } },
  },
];

describe('audience filtering', () => {
  it('offers only the audiences this page filters by, in suite order', () => {
    // n6 is tagged Investor and CISO; Investor is not a filter on this page.
    expect(audiencesOf(CLIPS)).toEqual(['CISO', 'Developers']);
  });

  it('still reaches every clip from the filters on offer', () => {
    expect(unreachableClips(CLIPS)).toEqual([]);
  });

  it('All keeps everything; a named audience keeps only its clips', () => {
    expect(filterByAudience(CLIPS, 'All')).toHaveLength(2);
    expect(filterByAudience(CLIPS, 'Developers').map((c) => c.slug)).toEqual(['c5-sdk-job']);
    expect(filterByAudience(CLIPS, 'Board')).toEqual([]);
  });
});

describe('ReelGrid', () => {
  it('shows every clip under All, in manifest order', () => {
    render(<ReelGrid clips={CLIPS} onSelect={jest.fn()} />);
    const cards = screen.getAllByTestId(/^reel-card-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual([
      'reel-card-n6-day-on-the-grid',
      'reel-card-c5-sdk-job',
    ]);
  });

  it('offers no chip for an audience this page does not filter by', () => {
    render(<ReelGrid clips={CLIPS} onSelect={jest.fn()} />);
    expect(screen.queryByTestId('reel-filter-investor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-filter-board')).not.toBeInTheDocument();
  });

  it('offers Partners as a chip wherever a clip carries it', () => {
    const withPartners: ReelClip[] = [...CLIPS, { ...CLIPS[1], slug: 'n5', audiences: ['Partners'] }];
    expect(audiencesOf(withPartners)).toEqual(['CISO', 'Developers', 'Partners']);
    render(<ReelGrid clips={withPartners} onSelect={jest.fn()} />);
    expect(screen.getByTestId('reel-filter-partners')).toBeInTheDocument();
  });

  /** Investor is in the clip data but must never reach the page. */
  it('does not render a hidden audience as a tag or a chip', () => {
    expect(CLIPS[0].audiences).toContain('Investor');
    render(<ReelGrid clips={CLIPS} onSelect={jest.fn()} />);
    expect(screen.queryByText('Investor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-filter-investor')).not.toBeInTheDocument();
  });

  it('narrows to one audience and back', async () => {
    const user = userEvent.setup();
    render(<ReelGrid clips={CLIPS} onSelect={jest.fn()} />);

    await user.click(screen.getByTestId('reel-filter-developers'));
    expect(screen.getAllByTestId(/^reel-card-/)).toHaveLength(1);
    expect(screen.getByTestId('reel-card-c5-sdk-job')).toBeInTheDocument();

    await user.click(screen.getByTestId('reel-filter-all'));
    expect(screen.getAllByTestId(/^reel-card-/)).toHaveLength(2);
  });

  it('says so rather than showing an empty frame when an audience has nothing', async () => {
    const user = userEvent.setup();
    render(<ReelGrid clips={[CLIPS[1]]} onSelect={jest.fn()} />);
    await user.click(screen.getByTestId('reel-filter-developers'));
    expect(screen.queryByTestId('reel-empty')).not.toBeInTheDocument();

    render(<ReelGrid clips={[]} onSelect={jest.fn()} />);
    expect(screen.getByTestId('reel-empty')).toBeInTheDocument();
  });

  /** The suite runs 0:49 to 2:49, so a constant here would be wrong on every card but one. */
  it('renders each clip its own runtime', () => {
    render(<ReelGrid clips={CLIPS} onSelect={jest.fn()} />);
    expect(screen.getByText('2:49')).toBeInTheDocument();
    expect(screen.getByText('1:02')).toBeInTheDocument();
  });

  it('marks only the clips that have a second cut', () => {
    render(<ReelGrid clips={CLIPS} onSelect={jest.fn()} />);
    expect(screen.getAllByText('CISO cut')).toHaveLength(1);
  });

  it('hands the chosen clip back, from a keyboard as readily as a mouse', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(<ReelGrid clips={CLIPS} onSelect={onSelect} />);

    await user.click(screen.getByTestId('reel-card-c5-sdk-job'));
    expect(onSelect).toHaveBeenCalledWith(CLIPS[1]);

    screen.getByTestId('reel-card-n6-day-on-the-grid').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(CLIPS[0]);
  });
});
