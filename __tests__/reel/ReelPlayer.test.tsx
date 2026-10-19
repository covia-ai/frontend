import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReelPlayer, cutsOf } from '@/components/reel/ReelPlayer';
import type { ReelClip } from '@/config/demo-reel';

const BOTH_CUTS: ReelClip = {
  slug: 'c1-the-refusal', id: 'c1', title: 'The Refusal',
  claim: 'An agent cannot act outside its authority.',
  synopsis: 'The rule runs first, and the approval never happens.',
  audiences: ['CISO', 'CTO'], runtimeSec: 79, poster: 'c1-the-refusal.webp',
  cuts: {
    narrated: { media: 'c1-the-refusal/narrated.mp4', captions: 'c1-the-refusal/narrated.vtt' },
    ciso: { media: 'c1-the-refusal/ciso.mp4', captions: 'c1-the-refusal/ciso.vtt' },
  },
};

const ONE_CUT: ReelClip = {
  slug: 'c5-sdk-job', id: 'c5', title: 'Run a Job with the SDK',
  claim: 'A developer reaches execution in a few lines.',
  audiences: ['Developers'], runtimeSec: 62, poster: 'c5-sdk-job.webp',
  cuts: { narrated: { media: 'c5-sdk-job/narrated.mp4', captions: 'c5-sdk-job/narrated.vtt' } },
};

function video(): HTMLVideoElement {
  return screen.getByTestId('reel-video') as HTMLVideoElement;
}

function track(): HTMLTrackElement {
  return video().querySelector('track') as HTMLTrackElement;
}

/**
 * jsdom has no media pipeline, so `play()` and `loadedmetadata` never happen on
 * their own. These stand in for the browser: a duration the player can clamp
 * against, a paused flag the switcher can read, and a way to fire the event the
 * player does its restoring work in.
 */
function stubMedia(el: HTMLVideoElement, { duration = 79, paused = true } = {}) {
  Object.defineProperty(el, 'duration', { value: duration, configurable: true });
  Object.defineProperty(el, 'paused', { value: paused, configurable: true, writable: true });
  el.play = jest.fn().mockResolvedValue(undefined);
}

describe('cutsOf', () => {
  it('offers both voices only where both exist', () => {
    expect(cutsOf(BOTH_CUTS)).toEqual(['narrated', 'ciso']);
    expect(cutsOf(ONE_CUT)).toEqual(['narrated']);
  });
});

describe('ReelPlayer', () => {
  it('renders nothing until a clip is chosen', () => {
    render(<ReelPlayer clip={null} onOpenChange={jest.fn()} />);
    expect(screen.queryByTestId('reel-player')).not.toBeInTheDocument();
  });

  it('opens on the narrated cut, with its captions sidecar', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(video()).toHaveAttribute('src', '/reel-media/c1-the-refusal/narrated.mp4');
    expect(track()).toHaveAttribute('src', '/reel-media/c1-the-refusal/narrated.vtt');
    expect(track()).toHaveAttribute('default');
  });

  /** Both sides name a room, so neither label describes how the file was made. */
  it('names each cut by who it is talking to', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('cut-narrated')).toHaveTextContent('Developer/CTO');
    expect(screen.getByTestId('cut-ciso')).toHaveTextContent('CISO');
    expect(screen.queryByText('Narrated')).not.toBeInTheDocument();
  });

  it('shows the switcher only when there is a second cut', () => {
    const { unmount } = render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('cut-switcher')).toBeInTheDocument();
    unmount();

    render(<ReelPlayer clip={ONE_CUT} onOpenChange={jest.fn()} />);
    expect(screen.queryByTestId('cut-switcher')).not.toBeInTheDocument();
  });

  it('swaps both the source and the caption track when the cut changes', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    stubMedia(video());

    await user.click(screen.getByTestId('cut-ciso'));

    expect(video()).toHaveAttribute('src', '/reel-media/c1-the-refusal/ciso.mp4');
    expect(track()).toHaveAttribute('src', '/reel-media/c1-the-refusal/ciso.vtt');
  });

  /** The whole point of the switcher: the same moment, in the other voice. */
  it('restores the playhead across a cut change, and resumes if it was playing', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);

    const el = video();
    stubMedia(el, { paused: false });
    el.currentTime = 42;

    await user.click(screen.getByTestId('cut-ciso'));
    stubMedia(video(), { paused: false });
    video().dispatchEvent(new Event('loadedmetadata'));

    await waitFor(() => expect(video().currentTime).toBe(42));
    expect(video().play).toHaveBeenCalled();
  });

  it('does not start playing a cut that was paused', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);

    const el = video();
    stubMedia(el, { paused: true });
    el.currentTime = 10;

    await user.click(screen.getByTestId('cut-ciso'));
    stubMedia(video(), { paused: true });
    video().dispatchEvent(new Event('loadedmetadata'));

    await waitFor(() => expect(video().currentTime).toBe(10));
    expect(video().play).not.toHaveBeenCalled();
  });

  it('never seeks past the end of the cut it is switching into', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);

    const el = video();
    stubMedia(el);
    el.currentTime = 500;

    await user.click(screen.getByTestId('cut-ciso'));
    stubMedia(video(), { duration: 79 });
    video().dispatchEvent(new Event('loadedmetadata'));

    await waitFor(() => expect(video().currentTime).toBe(79));
  });

  it('turns captions on once the source has loaded', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    const el = video();
    stubMedia(el);
    const modes: string[] = [];
    Object.defineProperty(el, 'textTracks', {
      configurable: true,
      value: [{ set mode(m: string) { modes.push(m); }, get mode() { return 'disabled'; } }],
    });

    el.dispatchEvent(new Event('loadedmetadata'));
    expect(modes).toContain('showing');
  });

  it('starts a newly chosen clip in its own voice', () => {
    const { rerender } = render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    rerender(<ReelPlayer clip={ONE_CUT} onOpenChange={jest.fn()} />);
    expect(video()).toHaveAttribute('src', '/reel-media/c5-sdk-job/narrated.mp4');
  });

  it('leaves crossOrigin off while the reel is served from this origin', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(video()).not.toHaveAttribute('crossorigin');
  });
});
