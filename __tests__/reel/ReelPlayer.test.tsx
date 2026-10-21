/**
 * The mp4 branch of the player.
 *
 * Both fixtures use slugs that deliberately appear nowhere in the upload record
 * (`config/demo-reel-youtube.ts`), because a clip that has been uploaded
 * resolves to a YouTube source and would never reach the `<video>` element
 * these tests are about. That is not a workaround: an un-uploaded clip is
 * exactly what self-hosting looks like, so this suite is the fallback path's
 * coverage. The YouTube path has its own suite in `ReelPlayerYouTube.test.tsx`.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReelPlayer, cutsOf } from '@/components/reel/ReelPlayer';
import type { ReelClip } from '@/config/demo-reel';

const BOTH_CUTS: ReelClip = {
  slug: 'x1-self-hosted-pair', id: 'x1', title: 'The Refusal',
  claim: 'An agent cannot act outside its authority.',
  synopsis: 'The rule runs first, and the approval never happens.',
  audiences: ['CISO', 'CTO'], runtimeSec: 79, poster: 'c1-the-refusal.webp',
  cuts: {
    narrated: { media: 'x1-self-hosted-pair/narrated.mp4', captions: 'x1-self-hosted-pair/narrated.vtt' },
    ciso: { media: 'x1-self-hosted-pair/ciso.mp4', captions: 'x1-self-hosted-pair/ciso.vtt' },
  },
};

const ONE_CUT: ReelClip = {
  slug: 'x5-self-hosted-single', id: 'x5', title: 'Run a Job with the SDK',
  claim: 'A developer reaches execution in a few lines.',
  audiences: ['Developers'], runtimeSec: 62, poster: 'c5-sdk-job.webp',
  cuts: { narrated: { media: 'x5-self-hosted-single/narrated.mp4', captions: 'x5-self-hosted-single/narrated.vtt' } },
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
    expect(video()).toHaveAttribute('src', '/reel-media/x1-self-hosted-pair/narrated.mp4');
    expect(track()).toHaveAttribute('src', '/reel-media/x1-self-hosted-pair/narrated.vtt');
    expect(track()).toHaveAttribute('default');
  });

  /** Both sides name a room, so neither label describes how the file was made. */
  it('names each cut by who it is talking to', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('cut-narrated')).toHaveTextContent('Developer/CTO');
    expect(screen.getByTestId('cut-ciso')).toHaveTextContent('CISO');
    expect(screen.queryByText('Narrated')).not.toBeInTheDocument();
  });

  /**
   * The affordance, not the behaviour: as a bare pair of words at the end of a
   * metadata row, nobody read this as something they could press.
   */
  it('presents the cuts as a labelled choice rather than two words', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);

    const tabs = screen.getByTestId('cut-switcher');
    expect(tabs).toHaveAttribute('role', 'tablist');

    const selected = screen.getByTestId('cut-narrated');
    expect(selected).toHaveAttribute('role', 'tab');
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('cut-ciso')).toHaveAttribute('aria-selected', 'false');

    // The unselected side must look pressable, which is what a first-time
    // viewer actually reads as "this does something".
    expect(screen.getByTestId('cut-ciso').className).toMatch(/hover:/);
    expect(screen.getByTestId('cut-ciso').className).toContain('cursor-pointer');
  });

  /** Violet fill as well as the underline, so a glance says which tab is on. */
  it('fills the selected tab rather than only underlining it', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('cut-narrated').className).toContain('bg-icon-violet');
    expect(screen.getByTestId('cut-ciso').className).not.toContain('bg-icon-violet/20');
  });

  /** Tabs belong above the picture: below it they read as a caption about it. */
  it('puts the tabs before the video in document order', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    const tabs = screen.getByTestId('cut-switcher');
    const position = tabs.compareDocumentPosition(screen.getByTestId('reel-video'));
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps aria-selected in step with the chosen cut', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    await user.click(screen.getByTestId('cut-ciso'));
    expect(screen.getByTestId('cut-ciso')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('cut-narrated')).toHaveAttribute('aria-selected', 'false');
  });

  /** The grid card can ask for a voice by name; the player must honour it. */
  it('opens on the cut it was asked for', () => {
    render(<ReelPlayer clip={BOTH_CUTS} initialCut="ciso" onOpenChange={jest.fn()} />);
    expect(video()).toHaveAttribute('src', '/reel-media/x1-self-hosted-pair/ciso.mp4');
    expect(screen.getByTestId('cut-ciso')).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the narrated cut when asked for one the clip lacks', () => {
    render(<ReelPlayer clip={ONE_CUT} initialCut="ciso" onOpenChange={jest.fn()} />);
    expect(video()).toHaveAttribute('src', '/reel-media/x5-self-hosted-single/narrated.mp4');
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

    expect(video()).toHaveAttribute('src', '/reel-media/x1-self-hosted-pair/ciso.mp4');
    expect(track()).toHaveAttribute('src', '/reel-media/x1-self-hosted-pair/ciso.vtt');
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
    expect(video()).toHaveAttribute('src', '/reel-media/x5-self-hosted-single/narrated.mp4');
  });

  it('leaves crossOrigin off while the reel is served from this origin', () => {
    render(<ReelPlayer clip={BOTH_CUTS} onOpenChange={jest.fn()} />);
    expect(video()).not.toHaveAttribute('crossorigin');
  });
});
