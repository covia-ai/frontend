"use client";

import { Sparkles } from "lucide-react";
import { DEFAULT_AGENT_ID } from "@/config/agents";

// A generated identicon for an agent, in the style of the Agents concept: a
// horizontally-symmetric 5×5 grid of rounded, spaced cells in the two brand
// colours (purple + cyan), derived deterministically from the agentId. Native
// agents have no key to feed the DID identicon (DidDisplay), so we hash the id
// ourselves — same id → same mark, every id → its own. The reserved assistant
// keeps its magic-wand glyph.

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

// 5 rows × 3 left columns (cols 3–4 mirror 1–0) → shape from one hash, the
// per-cell purple/cyan split from a second, so the mark reads as two-tone.
function cellsFor(id: string): Cell[] {
  const shape = hashId(id);
  const hue = hashId(`${id}~tone`);
  const cells: Cell[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const bit = y * 3 + x;
      if ((shape >> bit) & 1) {
        const color = (hue >> bit) & 1 ? "var(--primary)" : "var(--secondary)";
        cells.push({ x, y, color });
        if (x < 2) cells.push({ x: 4 - x, y, color });
      }
    }
  }
  // Never render a blank mark: seed the centre column if the hash came up empty.
  if (cells.length === 0) {
    cells.push({ x: 2, y: 1, color: "var(--primary)" }, { x: 2, y: 3, color: "var(--secondary)" });
  }
  return cells;
}

export function AgentIdenticon({
  agentId,
  className = "size-10",
}: {
  agentId: string;
  className?: string;
}) {
  if (agentId === DEFAULT_AGENT_ID) {
    return (
      <span
        className={`flex ${className} shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary`}
      >
        <Sparkles size={18} />
      </span>
    );
  }

  const cells = cellsFor(agentId);
  return (
    <span
      className={`flex ${className} shrink-0 items-center justify-center rounded-xl border bg-muted/50 p-1.5`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 5 5" className="size-full">
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x + 0.12}
            y={c.y + 0.12}
            width={0.76}
            height={0.76}
            rx={0.18}
            style={{ fill: c.color }}
          />
        ))}
      </svg>
    </span>
  );
}
