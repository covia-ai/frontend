"use client";

// A deterministic identity mark for a venue node. The Convex `Identicon` only
// renders for did:key identities; venues are did:web, so we generate our own —
// a horizontally-symmetric two-tone pattern hashed from the venueId, in the
// app's brand tokens (purple + blue) so it reads in both themes. Same venue →
// same mark, every venue its own.
//
// Deliberately distinct from the agent identicon (a rounded-SQUARE tile of
// rounded-square cells): a venue reads as a network NODE — a HEXAGON (the
// honeycomb/mesh motif) filled with two-tone DOTS — so the two never get
// confused while staying one generated-two-tone family.

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Cell {
  x: number;
  y: number;
  color: string;
}

// 5 rows × 3 left columns mirrored into 5 → shape from one hash, the per-cell
// purple/blue split from a second, so the mark reads as two-tone.
function cellsFor(id: string): Cell[] {
  const shape = hashId(id);
  const tone = hashId(`${id}~venue`);
  const cells: Cell[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const bit = y * 3 + x;
      if ((shape >> bit) & 1) {
        const color = (tone >> bit) & 1 ? "var(--primary)" : "var(--secondary)";
        cells.push({ x, y, color });
        if (x < 2) cells.push({ x: 4 - x, y, color });
      }
    }
  }
  // Never a blank mark.
  if (cells.length === 0) {
    cells.push({ x: 2, y: 1, color: "var(--primary)" }, { x: 2, y: 3, color: "var(--secondary)" });
  }
  return cells;
}

// Flat-top hexagon (honeycomb orientation) spanning the 5×5 dot-grid viewBox.
const HEX_POINTS = "1.25,0 3.75,0 5,2.5 3.75,5 1.25,5 0,2.5";

export function VenueMark({
  venueId,
  className = "size-9",
}: {
  venueId: string;
  className?: string;
}) {
  const cells = cellsFor(venueId);
  // Stable per-venue clip id so several marks on a page don't collide.
  const clipId = `venue-hex-${hashId(venueId).toString(36)}`;
  return (
    <span className={`inline-flex ${className} shrink-0 items-center justify-center`} aria-hidden="true">
      <svg viewBox="0 0 5 5" className="size-full" shapeRendering="geometricPrecision">
        <defs>
          <clipPath id={clipId}>
            <polygon points={HEX_POINTS} />
          </clipPath>
        </defs>
        {/* Hexagon fill (the node body). */}
        <polygon points={HEX_POINTS} style={{ fill: "var(--muted)", fillOpacity: 0.4 }} />
        {/* Two-tone identity dots, clipped to the hexagon. */}
        <g clipPath={`url(#${clipId})`}>
          {cells.map((c) => (
            <circle key={`${c.x}-${c.y}`} cx={c.x + 0.5} cy={c.y + 0.5} r={0.42} style={{ fill: c.color }} />
          ))}
        </g>
        {/* Hexagon outline on top. */}
        <polygon points={HEX_POINTS} fill="none" style={{ stroke: "var(--border)" }} strokeWidth={0.14} />
      </svg>
    </span>
  );
}
