import { DEMO_REEL } from '@/config/demo-reel';
import { audiencesOf, unreachableClips } from '@/components/reel/ReelGrid';
import { HIDDEN_AUDIENCES, publicAudiences } from '@/lib/reel-audiences';
import { formatRuntime, reelIsCrossOrigin, reelMediaUrl, reelPosterUrl } from '@/lib/reel-media';

/**
 * The manifest is generated, so these are not tests of hand-written data —
 * they are the contract the generator has to keep producing. If a re-render
 * drops a cut, renames a slug or emits a path the player cannot resolve, this
 * is where it surfaces rather than on the page.
 */

/** Exactly the clips whose script carries a governance register. */
const WITH_CISO = [
  'c0-the-grid', 'c1-the-refusal', 'c2-reconstruction', 'c3-governed-escalation',
  'c4-many-clouds', 'n3-fork-provenance', 'n5-connections', 'n6-day-on-the-grid',
];

describe('demo reel manifest', () => {
  it('carries the whole suite', () => {
    expect(DEMO_REEL).toHaveLength(13);
  });

  it('leads with the end-to-end clip, then the sharpest single claim', () => {
    expect(DEMO_REEL.map((c) => c.slug).slice(0, 2)).toEqual([
      'n6-day-on-the-grid',
      'c1-the-refusal',
    ]);
  });

  it('gives every clip the fields the card renders', () => {
    for (const clip of DEMO_REEL) {
      expect(clip.slug).toMatch(/^[a-z0-9-]+$/);
      expect(clip.title.length).toBeGreaterThan(0);
      expect(clip.claim.length).toBeGreaterThan(0);
      expect(clip.audiences.length).toBeGreaterThan(0);
      expect(clip.runtimeSec).toBeGreaterThan(0);
      expect(clip.poster).toBe(`${clip.slug}.webp`);
    }
  });

  it('has a narrated cut everywhere, and a CISO cut on exactly the governance clips', () => {
    const withCiso = DEMO_REEL.filter((c) => c.cuts.ciso).map((c) => c.slug);
    expect(withCiso.sort()).toEqual([...WITH_CISO].sort());
    for (const clip of DEMO_REEL) expect(clip.cuts.narrated).toBeDefined();
  });

  it('points every cut at media and captions under its own slug', () => {
    for (const clip of DEMO_REEL) {
      for (const [name, cut] of Object.entries(clip.cuts)) {
        expect(cut!.media).toBe(`${clip.slug}/${name}.mp4`);
        expect(cut!.captions).toBe(`${clip.slug}/${name}.vtt`);
      }
    }
  });

  /**
   * The player swaps cuts in place and restores the playhead, which is only
   * coherent because both cuts are the same picture. The manifest cannot
   * express a disagreement — one `runtimeSec` serves both — and the generator
   * refuses to emit a pair whose rendered durations differ. This records that
   * the shape is load-bearing, so nobody "fixes" it into a per-cut runtime
   * without understanding what the player assumes.
   */
  it('states one runtime per clip, shared by both cuts', () => {
    for (const clip of DEMO_REEL) {
      expect(clip).not.toHaveProperty('cuts.narrated.runtimeSec');
      expect(clip).not.toHaveProperty('cuts.ciso.runtimeSec');
    }
  });

  /**
   * The page filters by CTO, CISO and Developers only. Investor, Partners and
   * Board stay on the cards but are not chips, which is safe exactly as long as
   * no clip is tagged *only* with those. A new clip for investors alone would
   * be visible under All and unreachable under every chip — this catches it.
   */
  it('leaves no clip reachable only through an audience that is not a filter', () => {
    expect(audiencesOf(DEMO_REEL)).toEqual(['CTO', 'CISO', 'Partners', 'Developers']);
    expect(unreachableClips(DEMO_REEL).map((c) => c.slug)).toEqual([]);
  });

  /** Board is a tag, not a chip — but it is still shown on the card. */
  it('still tags clips for a room it does not filter by', () => {
    expect(DEMO_REEL.filter((c) => c.audiences.includes('Board')).length).toBeGreaterThan(0);
  });

  /**
   * The manifest keeps Investor because the clip scripts do and that targeting
   * is real; the page is what must not show it. Asserting both halves means
   * neither can be "tidied" into agreement by accident.
   */
  it('keeps Investor in the data and off the page', () => {
    const tagged = DEMO_REEL.filter((c) => c.audiences.includes('Investor')).map((c) => c.slug);
    expect(tagged.sort()).toEqual(['c0-the-grid', 'c4-many-clouds', 'n6-day-on-the-grid']);

    for (const clip of DEMO_REEL) {
      expect(publicAudiences(clip.audiences)).not.toContain('Investor');
    }
    expect(audiencesOf(DEMO_REEL)).not.toContain('Investor');

    // Whatever the hidden list grows to, no chip may come from it.
    for (const hidden of HIDDEN_AUDIENCES) {
      expect(audiencesOf(DEMO_REEL)).not.toContain(hidden);
    }
  });

  /** c4 drops to a single tag once Investor goes; none may drop to zero. */
  it('leaves every clip with at least one audience to show', () => {
    for (const clip of DEMO_REEL) {
      expect(publicAudiences(clip.audiences).length).toBeGreaterThan(0);
    }
    const c4 = DEMO_REEL.find((c) => c.slug === 'c4-many-clouds')!;
    expect(publicAudiences(c4.audiences)).toEqual(['CTO']);
  });

  /** Every chip on offer must match something, or it is a dead control. */
  it('offers no filter chip that matches nothing', () => {
    for (const audience of audiencesOf(DEMO_REEL)) {
      expect(DEMO_REEL.filter((c) => c.audiences.includes(audience)).length).toBeGreaterThan(0);
    }
  });
});

describe('reel media resolution', () => {
  it('resolves media and posters against their bases', () => {
    expect(reelMediaUrl('c1-the-refusal/narrated.mp4')).toBe(
      '/reel-media/c1-the-refusal/narrated.mp4',
    );
    expect(reelPosterUrl('c1-the-refusal.webp')).toBe('/reel/c1-the-refusal.webp');
  });

  it('does not double a slash when a path is already rooted', () => {
    expect(reelMediaUrl('/c1-the-refusal/narrated.mp4')).toBe(
      '/reel-media/c1-the-refusal/narrated.mp4',
    );
  });

  it('treats a relative base as same-origin and an absolute one as foreign', () => {
    expect(reelIsCrossOrigin('/reel-media')).toBe(false);
    expect(reelIsCrossOrigin('https://media.covia.ai/reels')).toBe(true);
    expect(reelIsCrossOrigin(`${window.location.origin}/reels`)).toBe(false);
  });

  it('formats runtimes as mm:ss', () => {
    expect(formatRuntime(49)).toBe('0:49');
    expect(formatRuntime(79)).toBe('1:19');
    expect(formatRuntime(169)).toBe('2:49');
  });
});
