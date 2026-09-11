import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The shared render atom for the "type → icon + tinted tile" system: a lucide
// icon centred in a `rounded-lg` tinted tile. `tile` carries the bg + text
// classes from file-type-look / workspace-look. Size defaults to the list size
// (size-9); pass a larger className (e.g. "size-10") for detail headers.
export function TypeTile({
  Icon,
  tile,
  className,
  iconSize = 18,
  title,
}: {
  Icon: LucideIcon;
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
