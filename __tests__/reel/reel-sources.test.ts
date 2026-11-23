import { DEMO_REEL, type ReelCutId } from '@/config/demo-reel';
import { REEL_YOUTUBE, REEL_YOUTUBE_PLAYER_PARAMS } from '@/config/demo-reel-youtube';
import { reelSource, youtubeEmbedUrl } from '@/lib/reel-sources';

/**
 * The upload record is generated from the demo-reel suite's own
 * `youtube-ids.json`, so these are not tests of hand-written data — they are
 * the contract between that record and the clip manifest. A re-render that
 * uploads a new video, or a clip that gains a governance cut without one, shows
 * up here rather than as a frame that silently never plays.
 */

/** Exactly the clips whose script carries a governance register. */
const WITH_CISO = [
  'c0-the-grid', 'c1-the-refusal', 'c2-reconstruction', 'c3-governed-escalation',
  'c4-many-clouds', 'n3-fork-provenance', 'n5-connections', 'n6-day-on-the-grid',
];

describe('demo reel upload record', () => {
  it('covers every clip in the manifest', () => {
    expect(Object.keys(REEL_YOUTUBE).sort()).toEqual(DEMO_REEL.map((c) => c.slug).sort());
  });

  it('has an upload for every cut the manifest renders', () => {
    for (const clip of DEMO_REEL) {
      for (const cut of Object.keys(clip.cuts) as ReelCutId[]) {
        expect(REEL_YOUTUBE[clip.slug]?.[cut]).toBeDefined();
      }
    }
  });

  it('uploads a governance cut for exactly the governance clips', () => {
    const withCiso = Object.entries(REEL_YOUTUBE)
      .filter(([, cuts]) => cuts.ciso)
      .map(([slug]) => slug);
    expect(withCiso.sort()).toEqual([...WITH_CISO].sort());
  });

  /**
   * Two of these ids differ only in characters that render identically in most
   * fonts, so a transcription slip is invisible on inspection. Length and
   * alphabet are what a slip would most likely break.
   */
  it('states a well-formed video id for every cut', () => {
    for (const cuts of Object.values(REEL_YOUTUBE)) {
      for (const cut of Object.values(cuts)) {
        expect(cut!.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      }
    }
  });

  it('never points two cuts at the same video', () => {
    const ids = Object.values(REEL_YOUTUBE).flatMap((cuts) =>
      Object.values(cuts).map((cut) => cut!.videoId),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The thirteen narrated cuts are the public reel. The eight governance cuts
   * are unlisted, which is not private: anybody with the link, this page
   * included, can watch them. Asserted so a later upload cannot quietly make a
   * governance cut public, or a narrated one unlisted and therefore invisible
   * to everyone who finds it through the channel.
   */
  it('keeps the narrated cuts public and the governance cuts unlisted', () => {
    for (const [slug, cuts] of Object.entries(REEL_YOUTUBE)) {
      expect(cuts.narrated?.visibility).toBe('public');
      if (cuts.ciso) expect(cuts.ciso.visibility).toBe('unlisted');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('has our own caption track published on every cut', () => {
    for (const cuts of Object.values(REEL_YOUTUBE)) {
      for (const cut of Object.values(cuts)) {
        expect(cut!.captions).toBe('published');
      }
    }
  });
});

describe('reelSource', () => {
  const uploaded = DEMO_REEL.find((c) => c.slug === 'c1-the-refusal')!;

  it('resolves an uploaded cut to its YouTube video', () => {
    const source = reelSource(uploaded, 'narrated');
    expect(source).toEqual({
      kind: 'youtube',
      src: REEL_YOUTUBE['c1-the-refusal'].narrated!.videoId,
      visibility: 'public',
    });
  });

  it('resolves each voice of a two-cut clip to a different video', () => {
    const narrated = reelSource(uploaded, 'narrated');
    const ciso = reelSource(uploaded, 'ciso');
    expect(narrated!.kind).toBe('youtube');
    expect(ciso!.kind).toBe('youtube');
    expect(narrated!.src).not.toBe(ciso!.src);
  });

  it('resolves every clip and cut in the manifest to something playable', () => {
    for (const clip of DEMO_REEL) {
      for (const cut of Object.keys(clip.cuts) as ReelCutId[]) {
        const source = reelSource(clip, cut);
        expect(source).not.toBeNull();
        expect(source!.src.length).toBeGreaterThan(0);
      }
    }
  });

  it('has nothing to resolve for a cut the clip does not have', () => {
    const single = DEMO_REEL.find((c) => !c.cuts.ciso)!;
    expect(reelSource(single, 'ciso')).toBeNull();
  });

  /**
   * The fallback is the whole point of the union: a clip that leaves the upload
   * record plays from the files the suite renders instead, with no component
   * change. That is what moving to self-hosted media would be.
   */
  it('falls back to the rendered files for a clip that was never uploaded', () => {
    const selfHosted = {
      ...uploaded,
      slug: 'x9-not-uploaded',
      cuts: {
        narrated: { media: 'x9-not-uploaded/narrated.mp4', captions: 'x9-not-uploaded/narrated.vtt' },
      },
    };
    expect(reelSource(selfHosted, 'narrated')).toEqual({
      kind: 'mp4',
      src: '/reel-media/x9-not-uploaded/narrated.mp4',
      captions: '/reel-media/x9-not-uploaded/narrated.vtt',
    });
  });
});

describe('youtubeEmbedUrl', () => {
  const url = (id: string, opts?: Parameters<typeof youtubeEmbedUrl>[1]) =>
    new URL(youtubeEmbedUrl(id, opts));

  /**
   * The load-bearing pair. Without them YouTube shows no captions until the
   * viewer opens the menu, and the automatic track — which mishears "Covia" as
   * "Kovia" and cannot be deleted — is one of the options there.
   */
  it('asks for our own caption track by default', () => {
    const params = url('abcdefghijk').searchParams;
    expect(params.get('cc_load_policy')).toBe('1');
    expect(params.get('cc_lang_pref')).toBe('en');
  });

  it('carries every parameter the upload record states', () => {
    const params = url('abcdefghijk').searchParams;
    for (const [key, value] of Object.entries(REEL_YOUTUBE_PLAYER_PARAMS)) {
      expect(params.get(key)).toBe(String(value));
    }
  });

  /** Without the JS API the cut switcher cannot read the playhead at all. */
  it('enables the JS API, which is what makes the playhead readable', () => {
    expect(url('abcdefghijk').searchParams.get('enablejsapi')).toBe('1');
  });

  it('embeds from the privacy-enhanced host', () => {
    expect(url('abcdefghijk').hostname).toBe('www.youtube-nocookie.com');
    expect(url('abcdefghijk').pathname).toBe('/embed/abcdefghijk');
  });

  it('passes a start position only when there is one', () => {
    expect(url('abcdefghijk').searchParams.has('start')).toBe(false);
    expect(url('abcdefghijk', { start: 42.7 }).searchParams.get('start')).toBe('42');
  });

  it('scopes the player to a given origin', () => {
    expect(url('abcdefghijk', { origin: 'https://app.covia.ai' }).searchParams.get('origin'))
      .toBe('https://app.covia.ai');
  });
});
