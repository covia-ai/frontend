"use client";

import { Code2, ShieldCheck } from "lucide-react";
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
export const CUT_LABELS: Record<ReelCutId, { label: string; hint: string; Icon: typeof Code2 }> = {
  narrated: {
    label: "Developer/CTO",
    hint: "Told to whoever builds and runs the system",
    Icon: Code2,
  },
  ciso: {
    label: "CISO",
    hint: "The same picture, told to whoever owns the risk",
    Icon: ShieldCheck,
  },
};

interface CutSwitcherProps {
  available: ReelCutId[];
  value: ReelCutId;
  onChange: (cut: ReelCutId) => void;
}

/**
 * Choose which voice is telling the clip.
 *
 * The first version was a bare segmented control sitting at the end of a row of
 * metadata, and it read as two words rather than as something you could press —
 * people did not discover the second cut at all. So it now says what it is
 * ("Narrated for"), carries an icon per audience, sits in a visible frame, and
 * gives the unselected side a hover state, which is the thing that actually
 * signals "this is a control" on a first look.
 *
 * Only rendered when a clip has both cuts, which is eight of the thirteen. On
 * the other five there is no control at all rather than a disabled one: a
 * greyed-out switch invites the question "how do I enable this?", and the
 * answer is that nothing is missing.
 */
export function CutSwitcher({ available, value, onChange }: CutSwitcherProps) {
  if (available.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        id="cut-switcher-label"
      >
        Narrated for
      </span>

      <div
        className="bg-muted/60 inline-flex gap-1 rounded-lg border p-1"
        role="radiogroup"
        aria-labelledby="cut-switcher-label"
        data-testid="cut-switcher"
      >
        {available.map((cut) => {
          const { label, hint, Icon } = CUT_LABELS[cut];
          const selected = cut === value;
          return (
            <button
              key={cut}
              type="button"
              role="radio"
              aria-checked={selected}
              title={hint}
              data-testid={`cut-${cut}`}
              onClick={() => onChange(cut)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
                selected
                  ? "bg-background text-foreground ring-border shadow-sm ring-1"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <span className="text-muted-foreground/80 w-full text-xs sm:w-auto">
        Same clip, two voices.
      </span>
    </div>
  );
}
