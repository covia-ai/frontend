import { SiLangchain, SiModelcontextprotocol } from "react-icons/si";
import { FaJava } from "react-icons/fa";

// Small marks for adapters the lucide set doesn't cover: two original geometric
// glyphs (convex, lattice) and thin wrappers around the real product logos
// (LangChain, MCP, Java) so they all take the same props a lucide icon does
// (size / className) and drop into the same tiles.

type GlyphProps = { size?: number; className?: string; strokeWidth?: number };

/** LangChain — the real brand mark. */
export function LangchainGlyph({ size = 18, className }: GlyphProps) {
  return <SiLangchain size={size} className={className} aria-hidden="true" />;
}
/** Model Context Protocol — the real brand mark. */
export function McpGlyph({ size = 18, className }: GlyphProps) {
  return <SiModelcontextprotocol size={size} className={className} aria-hidden="true" />;
}
/** Java (the JVM adapter) — the real brand mark. */
export function JavaGlyph({ size = 18, className }: GlyphProps) {
  return <FaJava size={size} className={className} aria-hidden="true" />;
}

/** A faceted hexagon — the `convex` lattice engine. Original geometry (not the
 *  Convex brand logo). */
export function ConvexGlyph({ size = 18, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 4h8l4 8-4 8H8l-4-8z" />
      <path d="M8 4l4 16 4-16" />
      <path d="M12 4v6" />
    </svg>
  );
}

/** A node grid — a `lattice`. */
export function LatticeGlyph({ size = 18, className }: GlyphProps) {
  const pts = [6, 12, 18];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M6 6h12M6 12h12M6 18h12M6 6v12M12 6v12M18 6v12" />
      </g>
      <g fill="currentColor">
        {pts.flatMap((y) => pts.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} />))}
      </g>
    </svg>
  );
}
