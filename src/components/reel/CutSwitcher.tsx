"use client";

import type { ReelCutId } from "@/config/demo-reel";
import { cn } from "@/lib/utils";

/**
 * What each cut is called on screen, and what it is for.
 *
 * Named by the room rather than by the artifact. "Narrated" described how the
 * cut was made, which told a viewer nothing and read oddly beside "CISO", a
 * label that names an audience. Both now answer the same question: who is this
 * one talking to?
 */
export const CUT_LABELS: Record<ReelCutId, { label: string; hint: string }> = {
  narrated: { label: "Developer/CTO", hint: "Told to whoever builds and runs the system" },
  ciso: { label: "CISO", hint: "The same picture, told to whoever owns the risk" },
};

interface CutSwitcherProps {
  available: ReelCutId[];
  value: ReelCutId;
  onChange: (cut: ReelCutId) => void;
}

/**
 * Choose which voice is telling the clip.
 *
 * Only rendered when a clip actually has both, which is eight of the thirteen.
 * On the other five there is no control at all rather than a disabled one:
 * a greyed-out switch invites the question "how do I enable this?", and the
 * answer is that nothing is missing.
 */
export function CutSwitcher({ available, value, onChange }: CutSwitcherProps) {
  if (available.length < 2) return null;

  return (
    <div
      className="bg-muted inline-flex rounded-md p-0.5"
      role="group"
      aria-label="Choose a narration"
      data-testid="cut-switcher"
    >
      {available.map((cut) => (
        <button
          key={cut}
          type="button"
          aria-pressed={cut === value}
          title={CUT_LABELS[cut].hint}
          data-testid={`cut-${cut}`}
          onClick={() => onChange(cut)}
          className={cn(
            "rounded-sm px-3 py-1 text-sm transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
            cut === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {CUT_LABELS[cut].label}
        </button>
      ))}
    </div>
  );
}
