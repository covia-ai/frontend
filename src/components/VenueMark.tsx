"use client";

// A deterministic identity mark for a venue node. The Convex `Identicon` only
// renders for did:key identities; venues are did:web, so we generate our own —
// a horizontally-symmetric two-tone pattern hashed from the venueId, in the
// app's brand tokens (purple + blue) so it reads in both themes. Same venue →
// same mark, every venue its own.
//
// Deliberately distinct from the agent identicon (a rounded-SQUARE tile of
// rounded-square cells): a venue reads as a network NODE — a round chip of
// two-tone DOTS — so the two never get confused while staying one family.

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
      className={`inline-flex ${className} shrink-0 items-center justify-center rounded-full border bg-muted/40`}
      aria-hidden="true"
    >
      {/* 72% of the container (not padding — percentage padding is relative to
          the parent's width, which would blow the mark up) leaves a clean ring
          margin around the dots. */}
      <svg viewBox="0 0 5 5" className="h-[72%] w-[72%]" shapeRendering="geometricPrecision">
        {cells.map((c) => (
          <circle
            key={`${c.x}-${c.y}`}
            cx={c.x + 0.5}
            cy={c.y + 0.5}
            r={0.42}
            style={{ fill: c.color }}
          />
        ))}
      </svg>
    </span>
  );
}
