"use client";

// A deterministic identity mark for a venue node. The Convex `Identicon` only
// renders for did:key identities; venues are did:web, so we generate our own —
// a horizontally-symmetric two-tone pattern hashed from the venueId, in the
// app's brand tokens (purple + blue) so it reads in both themes. Same venue →
// same mark, every venue its own.
//
// A rounded tile of SMALL, sharp two-tone squares with clear gaps — the Covia
// logo's pixel motif. Deliberately distinct from the agent identicon on two
// axes: agents render larger rounded cells in the purple+blue brand pair, while
// a venue is a sparser pixel grid in its own TEAL+CYAN palette — so at a glance
// agents read violet and venues read aqua, even though both share the same
// deterministic hash family.
const VENUE_TONE_A = "#0D9488"; // teal
const VENUE_TONE_B = "#06B6D4"; // cyan

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
        const color = (tone >> bit) & 1 ? VENUE_TONE_A : VENUE_TONE_B;
        cells.push({ x, y, color });
        if (x < 2) cells.push({ x: 4 - x, y, color });
      }
    }
  }
  // Never a blank mark.
  if (cells.length === 0) {
    cells.push({ x: 2, y: 1, color: VENUE_TONE_A }, { x: 2, y: 3, color: VENUE_TONE_B });
  }
  return cells;
}

export function VenueMark({
  venueId,
  className = "size-9",
}: {
  venueId: string;
  className?: string;
}) {
  const cells = cellsFor(venueId);
  return (
    <span
      className={`inline-flex ${className} shrink-0 items-center justify-center rounded-lg border bg-muted/40`}
      aria-hidden="true"
    >
      {/* svg sized off the definite container (percentage padding is relative to
          the parent's width, which would blow the mark up). */}
      <svg viewBox="0 0 5 5" className="h-[76%] w-[76%]" shapeRendering="geometricPrecision">
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x + 0.25}
            y={c.y + 0.25}
            width={0.5}
            height={0.5}
            rx={0.05}
            style={{ fill: c.color }}
          />
        ))}
      </svg>
    </span>
  );
}
