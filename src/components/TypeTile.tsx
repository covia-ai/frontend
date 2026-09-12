import { cn } from "@/lib/utils";
import type { IconCmp } from "@/lib/file-type-look";

// The shared render atom for the "type → icon + tinted tile" system: an icon
// (a lucide icon, a brand logo, or a custom mark) centred in a `rounded-lg`
// tinted tile. `tile` carries the bg + text classes from file-type-look /
// concept-icons / adapter-icons / workspace-look. Size defaults to the list
// size (size-9); pass a larger className (e.g. "size-10") for detail headers.
export function TypeTile({
  Icon,
  tile,
  className,
  iconSize = 18,
  title,
}: {
  Icon: IconCmp;
  tile: string;
  className?: string;
  iconSize?: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-hidden={title ? undefined : true}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tile, className)}
    >
      <Icon size={iconSize} strokeWidth={1.9} />
    </span>
  );
}
