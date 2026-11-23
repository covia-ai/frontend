/**
 * Which audiences the Resources page is willing to show.
 *
 * The clip scripts in the demo-reels tree tag some clips for an Investor
 * audience, and that targeting is true and useful when deciding which clip to
 * put in front of whom. It is just not something a public product page should
 * advertise: a visitor reading "Investor" on a demo learns something about who
 * we are selling to rather than about the clip.
 *
 * So the audience is filtered out HERE, where the page builds what it renders,
 * and deliberately NOT by editing `script.ts` or the generated manifest. If you
 * are about to "fix" this by syncing the page back to the clip metadata, this
 * is the thing you would be undoing — the divergence is the point.
 */
export const HIDDEN_AUDIENCES = ["Investor"];

/** A clip's audiences, less the ones this page does not put on screen. */
export function publicAudiences(audiences: string[]): string[] {
  return audiences.filter((audience) => !HIDDEN_AUDIENCES.includes(audience));
}
