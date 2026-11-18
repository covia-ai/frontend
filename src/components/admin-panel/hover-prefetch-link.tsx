"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

// The sidebar is on every page, and a default <Link> prefetches its route as
// soon as it scrolls into view. With ~15 entries that meant every page load
// also pulled the RSC payload and JS chunks of most other routes (#477:
// ~300 KB of JS the page never used). This waits for intent instead: the
// route is prefetched on hover or keyboard focus, which still lands well
// before the click on a typical pointer.
//
// Handlers are chained rather than replaced, because Radix's `asChild`
// (TooltipTrigger, Button) passes its own onMouseEnter/onFocus through here.
export function HoverPrefetchLink({
  onMouseEnter,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
}
