import { identiconGridForDid } from "@/lib/identicon";
import { cn } from "@/lib/utils";

interface IdenticonProps {
  did: string | null | undefined;
  /** Rendered size in px. */
  size?: number;
  /** Grid resolution (Convex default 7). */
  gridSize?: number;
  className?: string;
  title?: string;
}

// Renders the Convex identicon for a did:key identity, or nothing for any other
// identity — OAuth/bearer accounts get an avatar treatment later, not this.
export function Identicon({ did, size = 24, gridSize = 7, className, title }: IdenticonProps) {
  const grid = identiconGridForDid(did, gridSize);
  if (!grid) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      role="img"
      aria-label={title ?? "identity icon"}
      shapeRendering="crispEdges"
      className={cn("rounded-sm shrink-0", className)}
    >
      {title && <title>{title}</title>}
      {grid.map((rgb, i) => (
        <rect
          key={i}
          x={i % gridSize}
          y={Math.floor(i / gridSize)}
          width={1}
          height={1}
          fill={`#${rgb.toString(16).padStart(6, "0")}`}
        />
      ))}
    </svg>
  );
}
