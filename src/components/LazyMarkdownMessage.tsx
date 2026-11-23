"use client";

import { lazy, memo, Suspense } from "react";

import type { MarkdownBodyProps } from "@/components/MarkdownBody";
import { cn } from "@/lib/utils";

// The remark/rehype pipeline is ~90 KB gzip (#473). Chat transcripts and skill
// bodies arrive after a venue read anyway, so load it with the first message
// rather than with the page. Until it lands the text shows as-is, in the same
// container, so nothing is hidden while it loads.
const MarkdownMessage = lazy(() =>
  import("@/components/MarkdownMessage").then((m) => ({ default: m.MarkdownMessage })),
);

function LazyMarkdownMessageComponent({ children, className }: MarkdownBodyProps) {
  return (
    <Suspense
      fallback={
        <div className={cn("agent-markdown whitespace-pre-wrap break-words", className)}>
          {children}
        </div>
      }
    >
      <MarkdownMessage className={className}>{children}</MarkdownMessage>
    </Suspense>
  );
}

export const LazyMarkdownMessage = memo(LazyMarkdownMessageComponent);
