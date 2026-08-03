import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeadingProps {
  text: ReactNode;
  highlight: ReactNode;
  size?: "lg" | "sm";
  align?: "center" | "left";
  className?: string;
}

// Replaces the bg-gradient-to-b/bg-clip-text headline that was copy-pasted
// across six files. Hierarchy now comes from weight/tracking and a solid
// accent underline instead of a color gradient on the text itself.
export function PageHeading({ text, highlight, size = "lg", align = "center", className }: PageHeadingProps) {
  const isLarge = size === "lg";
  const Tag = isLarge ? "h3" : "h2";

  return (
    <div className={cn("flex flex-col", align === "center" ? "items-center text-center" : "items-start text-left", className)}>
      <Tag className={cn("font-semibold tracking-tight text-foreground", isLarge ? "text-4xl" : "text-2xl")}>
        {text}{" "}
        <span className="relative inline-block text-primary">
          {highlight}
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-accent" />
        </span>
      </Tag>
    </div>
  );
}
