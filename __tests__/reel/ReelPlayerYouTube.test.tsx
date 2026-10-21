import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReelPlayer } from '@/components/reel/ReelPlayer';
import { DEMO_REEL } from '@/config/demo-reel';
import { REEL_YOUTUBE } from '@/config/demo-reel-youtube';

/**
 * The YouTube branch of the player.
 *
 * jsdom will not fetch YouTube's IFrame API and could not run its player if it
 * did, so `window.YT` is installed by hand here. That is enough to test what
 * this branch is actually responsible for: handing the right video id to the
 * player, carrying the caption parameters, moving the playhead from one cut to
 * the other, and saying something useful when a video refuses to embed.
 *
 * Whether a given video really plays in a frame is not knowable from jsdom —
 * that was checked against the live embeds, with every unlisted cut opened in
 * turn.
 */

const PLAYING = 1;
const PAUSED = 2;

type PlayerOptions = {
  videoId: string;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: { onError?: (event: { data: number }) => void };
};

let created: PlayerOptions[] = [];
let loaded: { videoId: string; startSeconds?: number }[] = [];
let cued: { videoId: string; startSeconds?: number }[] = [];
let currentTime = 0;
let playerState = PAUSED;
let lastError: ((event: { data: number }) => void) | undefined;

beforeAll(() => {
  (window as unknown as { YT: unknown }).YT = {
    PlayerState: { PLAYING },
    Player: function (this: unknown, _el: HTMLElement, options: PlayerOptions) {
      created.push(options);
      lastError = options.events?.onError;
      return {
        getCurrentTime: () => currentTime,
        getPlayerState: () => playerState,
        loadVideoById: (o: { videoId: string; startSeconds?: number }) => {
          loaded.push(o);
          currentTime = o.startSeconds ?? 0;
        },
        cueVideoById: (o: { videoId: string; startSeconds?: number }) => {
          cued.push(o);
          currentTime = o.startSeconds ?? 0;
        },
        destroy: () => {},
      };
    },
  };
});

beforeEach(() => {
  created = [];
  loaded = [];
  cued = [];
  currentTime = 0;
  playerState = PAUSED;
  lastError = undefined;
});

const TWO_CUTS = DEMO_REEL.find((c) => c.slug === 'c1-the-refusal')!;
const ONE_CUT = DEMO_REEL.find((c) => c.slug === 'c5-sdk-job')!;
const ids = REEL_YOUTUBE['c1-the-refusal'];

/** The player is built inside a resolved promise, so it lands a tick late. */
async function player() {
  await waitFor(() => expect(created.length).toBeGreaterThan(0));
  return created[0];
}

describe('ReelPlayer on YouTube', () => {
  it('plays an uploaded clip from YouTube rather than from a file', async () => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('reel-youtube')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-video')).not.toBeInTheDocument();
    expect((await player()).videoId).toBe(ids.narrated!.videoId);
  });

  it('opens on the narrated cut', async () => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('reel-youtube')).toHaveAttribute(
      'data-video-id',
      ids.narrated!.videoId,
    );
  });

  it('opens on the cut the card asked for', async () => {
    render(<ReelPlayer clip={TWO_CUTS} initialCut="ciso" onOpenChange={jest.fn()} />);
    expect((await player()).videoId).toBe(ids.ciso!.videoId);
    expect(screen.getByTestId('cut-ciso')).toHaveAttribute('aria-selected', 'true');
  });

  /** Captions are a player parameter here, not a DOM call on a text track. */
  it('creates the player with our caption track switched on', async () => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    const vars = (await player()).playerVars!;
    expect(vars.cc_load_policy).toBe('1');
    expect(vars.cc_lang_pref).toBe('en');
  });

  /**
   * The API builds its own iframe and defaults to youtube.com, so the
   * privacy-enhanced host only applies if it is passed in. Asserted because
   * the failure is invisible: the player works either way.
   */
  it('serves the player from the privacy-enhanced host', async () => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    expect((await player()).host).toBe('https://www.youtube-nocookie.com');
  });

  it('shows no switcher on a clip with one cut', () => {
    render(<ReelPlayer clip={ONE_CUT} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('reel-youtube')).toBeInTheDocument();
    expect(screen.queryByTestId('cut-switcher')).not.toBeInTheDocument();
  });

  it('swaps the video when the cut changes', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    await player();

    await user.click(screen.getByTestId('cut-ciso'));

    await waitFor(() => expect(cued).toHaveLength(1));
    expect(cued[0].videoId).toBe(ids.ciso!.videoId);
    // One player for the life of the dialog: a second would mean the playhead
    // was thrown away rather than carried over.
    expect(created).toHaveLength(1);
  });

  /** The whole point of the switcher: the same moment, in the other voice. */
  it('carries the playhead into the cut it switches to', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    await player();

    currentTime = 42;
    await user.click(screen.getByTestId('cut-ciso'));

    await waitFor(() => expect(cued).toHaveLength(1));
    expect(cued[0].startSeconds).toBe(42);
  });

  it('keeps playing through a switch that happened mid-playback', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    await player();

    currentTime = 17;
    playerState = PLAYING;
    await user.click(screen.getByTestId('cut-ciso'));

    await waitFor(() => expect(loaded).toHaveLength(1));
    expect(loaded[0]).toEqual({ videoId: ids.ciso!.videoId, startSeconds: 17 });
    expect(cued).toHaveLength(0);
  });

  it('switches back to the narrated cut at the same moment', async () => {
    const user = userEvent.setup();
    render(<ReelPlayer clip={TWO_CUTS} initialCut="ciso" onOpenChange={jest.fn()} />);
    await player();

    currentTime = 30;
    await user.click(screen.getByTestId('cut-narrated'));

    await waitFor(() => expect(cued).toHaveLength(1));
    expect(cued[0]).toEqual({ videoId: ids.narrated!.videoId, startSeconds: 30 });
  });

  /**
   * An unlisted video uploaded with embedding disabled fails exactly here, and
   * otherwise fails silently: the frame just sits there. Both codes mean the
   * same thing, and the viewer is given the one route that still works.
   */
  it.each([101, 150])('says so, and offers YouTube, when embedding is refused (%i)', async (code) => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    await player();

    lastError!({ data: code });

    await waitFor(() => expect(screen.getByTestId('reel-embed-failure')).toBeInTheDocument());
    expect(screen.getByText('This cut cannot be played here')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Watch it on YouTube' });
    expect(link).toHaveAttribute(
      'href',
      `https://www.youtube.com/watch?v=${ids.narrated!.videoId}`,
    );
  });

  it('reports any other player error as simply unavailable', async () => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    await player();

    lastError!({ data: 100 });

    await waitFor(() => expect(screen.getByTestId('reel-embed-failure')).toBeInTheDocument());
    expect(screen.getByText('This cut is unavailable')).toBeInTheDocument();
  });

  it('keeps the tabs above the picture', () => {
    render(<ReelPlayer clip={TWO_CUTS} onOpenChange={jest.fn()} />);
    const tabs = screen.getByTestId('cut-switcher');
    const position = tabs.compareDocumentPosition(screen.getByTestId('reel-youtube'));
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('still shows the clip metadata, with Investor withheld', () => {
    const n6 = DEMO_REEL.find((c) => c.slug === 'n6-day-on-the-grid')!;
    render(<ReelPlayer clip={n6} onOpenChange={jest.fn()} />);
    expect(n6.audiences).toContain('Investor');
    expect(screen.queryByText('Investor')).not.toBeInTheDocument();
    // Not CISO, which is also a tab label on this clip and so matches twice.
    expect(screen.getByText('Partners')).toBeInTheDocument();
  });
});
